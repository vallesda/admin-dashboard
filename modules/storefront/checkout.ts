import 'server-only';

/**
 * TDA — guest checkout.
 *
 * Orchestrates Customers and Sales. It contains no business rules of its own:
 * pricing, stock and totals are all decided inside `createOrder`, exactly as
 * they are for an order taken over the phone (RN-010 — one domain, not two).
 *
 * What the caller sends is product ids and quantities. It never sends prices.
 */
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema/sales';
import { changeOrderStatus, createOrder } from '@/modules/sales/service';
import { createCustomer, findByPhone } from '@/modules/customers/service';
import { customerSchema } from '@/modules/customers/validators';
import { createOrderSchema } from '@/modules/sales/validators';
import { openCheckout, voidOpenAttempts } from '@/modules/payments/checkout';
import { ConflictError } from '@/lib/errors';
import { deliveryAddressSchema } from '@/modules/sales/address';

export const checkoutSchema = z
  .object({
    customer: customerSchema,
    fulfillmentType: z.enum(['pickup', 'delivery']),
    /**
     * How the shopper chose to pay.
     *
     * Defaults to `on_site` so an older storefront that does not send the field
     * keeps working and keeps its current behaviour — apartar y pagar al
     * recibir — rather than silently acquiring an online charge it never asked
     * for. The storefront is about to become a separate deployment, so its
     * version and the admin's will not always move together.
     */
    paymentMode: z.enum(['online', 'on_site']).default('on_site'),
    /**
     * Where to send the shopper back to. Sent by the storefront because a system
     * that is about to live in another repository cannot have its domain
     * hard-coded here; validated against an allow-list in `lib/stripe.ts`
     * because accepting any URL would be an open redirect wearing the shop's
     * branding.
     */
    returnUrls: z
    .object({ success: z.string().url(), cancel: z.string().url() })
    .optional(),
    /*
     * `returnUrls.success` may contain the literal `{TOKEN}`, which is replaced
     * with the order's public token before the URL is validated and handed to the
     * provider.
     *
     * The storefront cannot build that URL itself: the token is created by this
     * very call. The alternative — the admin appending `/pedido/<token>` to a
     * base URL — would put the storefront's route structure in the admin, which
     * is the coupling the whole seam exists to avoid. A placeholder keeps the
     * path the storefront's business and the token ours.
     */
    /**
     * The address in parts. Required for a delivery, absent for a pickup.
     *
     * It used to be one free-text string. A sentence cannot be routed, checked
     * against a delivery zone, or handed to a courier — see
     * `modules/sales/address.ts`.
     */
    deliveryAddress: deliveryAddressSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
    /*
     * Acotado por arriba, y no por gusto.
     *
     * `createOrder` **aparta inventario antes de cobrar** — correcto para
     * producto perecedero, y la razón de que este esquema sea la única puerta.
     * `placeOrder` es un Server Action público: sin sesión, sin captcha. Con
     * `.min(1)` y ningún tope, una sola petición anónima podía apartar 1000
     * unidades de cada producto del catálogo, y quedaba apartado hasta que
     * venciera la sesión de Stripe o corriera el barrido del día siguiente.
     *
     * Para una pescadería con una captura al día, eso es cerrar la tienda. Y no
     * hace falta mala fe: basta alguien que pulse «Confirmar» cinco veces.
     *
     * Los dos topes son de negocio, no técnicos. 40 líneas es un carrito
     * enorme —el catálogo tiene 13 productos— y 50 unidades de una misma pieza
     * es un pedido de restaurante, que es exactamente lo que esta tienda dice no
     * atender (sólo B2C). Cualquier cosa por encima es un error o un abuso, y en
     * ambos casos la respuesta correcta es la misma.
     *
     * Esto **no sustituye** a un límite por IP: acota una petición, no cuántas.
     */
    lines: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce
            .number()
            .int()
            .positive()
            .max(50, { message: 'Máximo 50 piezas por producto en un pedido.' }),
        }),
      )
      .min(1, { message: 'El carrito está vacío.' })
      .max(40, { message: 'Demasiados productos distintos en un pedido.' }),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === 'delivery' && !data.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryAddress'],
        message: 'Una entrega a domicilio necesita dirección.',
      });
    }

    /*
     * The shop offers two ways to pay and this is the combination it does not:
     * cash is collected across the counter, never from a driver. Rejected here
     * as well as by `createOrderSchema` and a CHECK constraint, because this is
     * the boundary a separate storefront talks to and the message it gets back
     * should name the actual rule.
     */
    if (data.paymentMode === 'on_site' && data.fulfillmentType === 'delivery') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMode'],
        message:
          'Los pedidos a domicilio se pagan en línea. El efectivo es sólo al recoger en la tienda.',
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Discriminated by `paymentMode`, so a client cannot read an `on_site` result
 * as if it carried a payment URL.
 */
export type CheckoutResult = {
  orderNumber: number;
  token: string;
} & (
  | {
      paymentMode: 'online';
      payment: {
        status: 'pending';
        /**
         * Where to pay. Deliberately not named `stripeCheckoutUrl`: the
         * storefront must not learn the provider's name (DOCS/PAGOS.md §8.1).
         *
         * Null when the order is payable online but no page could be opened —
         * the provider was unavailable. The order is real and the shop will
         * send a link; the storefront shows the confirmation instead of
         * redirecting.
         */
        checkoutUrl: string | null;
        expiresAt: string | null;
      };
    }
  | {
      paymentMode: 'on_site';
      payment: { status: 'on_delivery'; instructions: string };
    }
);

/**
 * Turns a cart into an order.
 *
 * Repeat buyers are matched by phone so the shop does not accumulate a new
 * customer record for the same person on every purchase. `findByPhone` compares
 * digits only, so "55 1234 5678" and "(55) 1234-5678" resolve to one person.
 *
 * NOTE ON ATOMICITY: the customer is created before the order, in a separate
 * statement. If the order then fails — out of stock, product deactivated — a
 * customer row remains with no orders. That is harmless and visible, and the
 * alternative (threading a transaction through two contexts) buys tidiness at
 * the cost of coupling them. Revisit if orphan customers ever become noise.
 */
export async function checkout(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const existing = await findByPhone(input.customer.phone);

  const customer =
    existing ?? (await createCustomer(customerSchema.parse(input.customer)));

  const order = await createOrder(
    createOrderSchema.parse({
      customerId: customer.id,
      fulfillmentType: input.fulfillmentType,
      deliveryAddress: input.deliveryAddress,
      // No se manda ningún costo de envío: lo cotiza `createOrder` desde el
      // código postal (`DEL`). La tienda dice a dónde va; la tienda física dice
      // cuánto cuesta llevarlo.
      notes: input.notes,
      lines: input.lines,
      paymentMode: input.paymentMode,
    }),
    // No admin actor: nobody at the shop touched this order.
    null,
  );

  const [row] = await db
    .select({ publicToken: orders.publicToken })
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  if (input.paymentMode === 'on_site') {
    return {
      orderNumber: order.orderNumber,
      token: row.publicToken,
      paymentMode: 'on_site',
      payment: {
        status: 'on_delivery',
        // No branch on fulfillment any more: `on_site` can only be a pickup,
        // and the schema refuses anything else.
        instructions: 'Paga en efectivo al recoger tu pedido en la tienda.',
      },
    };
  }

  if (!input.returnUrls) {
    throw new ConflictError(
      'checkout.missing_return_urls',
      'Falta indicar a dónde regresar después del pago.',
    );
  }

  /*
   * The order already exists and its stock is already reserved (§4.2). That
   * ordering is what makes the failure below survivable.
   *
   * If the payment provider is down or unconfigured, throwing would leave a
   * real order holding real stock while the shopper sees a generic error and no
   * order number — the worst of both paths. Instead the order falls back to the
   * one this shop has always had: it becomes payable at the counter, and the
   * confirmation page says so.
   *
   * This is only defensible because the two paths are genuine equals here. In a
   * shop that could not take cash, the right answer would be to release the
   * reservation and fail loudly.
   */
  try {
    const { checkoutUrl, expiresAt } = await openCheckout({
      orderId: order.id,
      successUrl: input.returnUrls.success.replace('{TOKEN}', row.publicToken),
      cancelUrl: input.returnUrls.cancel,
    });

    return {
      orderNumber: order.orderNumber,
      token: row.publicToken,
      paymentMode: 'online',
      payment: {
        status: 'pending',
        checkoutUrl,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    };
  } catch (error) {
    console.error('[checkout] no se pudo abrir el cobro en línea', error);

    /*
     * El proveedor está caído o sin configurar. El pedido ya existe y ya apartó
     * inventario, así que hay que deshacerlo.
     *
     * Desde que la tienda cobra siempre por adelantado, dejar el pedido en pie
     * es la peor de las opciones: aparta pescado que nadie pagó, en nombre de
     * alguien que quiso pagar y no pudo. Antes esto se bifurcaba —a domicilio
     * quedaba pendiente, a recoger se convertía en efectivo al mostrador— y
     * ninguna de las dos ramas sigue siendo legal.
     *
     * Se cancela por `changeOrderStatus`, no con un `UPDATE` a mano: esa función
     * es la que devuelve la reserva al inventario y escribe el movimiento. Un
     * `UPDATE` aquí sería una segunda forma de cancelar un pedido, y las dos
     * acabarían discrepando. `actorId` va en `null` porque nadie de la tienda
     * canceló esto.
     *
     * `voidOpenAttempts` primero, por si el cobro alcanzó a crear un intento
     * antes de fallar. Es el mismo orden que usa el barrido programado.
     */
    try {
      await voidOpenAttempts(order.id);
      await changeOrderStatus(order.id, 'cancelled', null);
    } catch (cleanupError) {
      /*
       * Si la limpieza también falla, el pedido queda vivo apartando producto.
       * No se relanza este error: el que importa para el cliente es el de
       * abajo, y taparlo con un fallo de limpieza le diría algo que no le sirve.
       *
       * Ese pedido huérfano no se queda ahí para siempre: el barrido de
       * reservas abandonadas lo recoge. Esto es lo que hace que fallar aquí sea
       * survivable — hay una segunda red debajo.
       */
      console.error(
        '[checkout] el pedido quedó sin cancelar tras fallar el cobro',
        { orderId: order.id, orderNumber: order.orderNumber },
        cleanupError,
      );
    }

    /*
     * Se lanza, no se devuelve un pedido a medias.
     *
     * El cliente no tiene ningún pedido —acaba de cancelarse— así que enseñarle
     * una confirmación sería mentirle. `ConflictError` llega a la tienda como un
     * 422 con este texto, que es el que verá en el formulario.
     */
    throw new ConflictError(
      'checkout.payment_unavailable',
      'No pudimos abrir el pago en línea, así que no se generó tu pedido. ' +
        'Vuelve a intentarlo en un momento.',
    );
  }
}
