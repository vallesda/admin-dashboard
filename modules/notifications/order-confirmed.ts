import 'server-only';

/**
 * NOT — avisar al comprador de que su pedido está confirmado.
 *
 * Lee el pedido ya escrito y lo traduce a un correo. No calcula importes: los
 * toma de las mismas columnas que se cobraron, porque un total recalculado para
 * el correo puede discrepar del que se cobró — y el cliente cree lo que lee en
 * el correo.
 */
import { eq } from 'drizzle-orm';
import { createElement } from 'react';

import { db } from '@/db';
import { orders, orderItems } from '@/db/schema/sales';
import { WHATSAPP_LABEL, WHATSAPP_URL } from './contact';
import OrderConfirmed from '@/emails/order-confirmed';
import { send, storefrontOrigin, isEmailConfigured } from './email';

/** La dirección del mostrador, para el pedido que se recoge. */
const SHOP_ADDRESS =
  'Río Amazonas 132 Ote., Local 1A, Col. Del Valle, San Pedro Garza García';

/** «Río Nazas 120 int. 4, Del Valle, San Pedro…», en una línea. */
function formatAddress(order: {
  deliveryStreet: string | null;
  deliveryExtNumber: string | null;
  deliveryIntNumber: string | null;
  deliveryNeighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPostalCode: string | null;
}): string {
  const street = [order.deliveryStreet, order.deliveryExtNumber]
    .filter(Boolean)
    .join(' ');
  const withInt = order.deliveryIntNumber
    ? `${street} int. ${order.deliveryIntNumber}`
    : street;

  return [
    withInt,
    order.deliveryNeighborhood,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPostalCode ? `C.P. ${order.deliveryPostalCode}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Manda la confirmación, y **nunca lanza**.
 *
 * Devuelve por qué no se envió en lugar de fallar, porque quien la llama es
 * `fulfillCheckout`: un error aquí saldría del webhook como 500, Stripe
 * reintentaría la confirmación entera, y un correo que no salió habría puesto
 * en duda un pago que sí entró.
 *
 * La clave de idempotencia es el propio pedido. `fulfillCheckout` corre dos
 * veces por diseño —webhook y página de retorno— y sin la clave el comprador
 * recibiría el mismo correo dos veces cada vez.
 */
export async function sendOrderConfirmation(orderId: string): Promise<
  { sent: true; id: string } | { sent: false; reason: string }
> {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'Correo no configurado en este despliegue.' };
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { sent: false, reason: 'El pedido no existe.' };

  /*
   * Sin correo no hay a quién escribir, y eso es normal: el mostrador levanta
   * pedidos por teléfono y `customerSchema` acepta el correo nulo a propósito.
   * Sólo los pedidos de la tienda lo traen siempre.
   */
  if (!order.customerEmail) {
    return { sent: false, reason: 'El pedido no tiene correo del cliente.' };
  }

  const origin = storefrontOrigin();

  if (!origin) {
    return {
      sent: false,
      reason:
        'STOREFRONT_ALLOWED_ORIGINS está vacía: no se sabe a qué tienda enlazar.',
    };
  }

  const items = await db
    .select({
      name: orderItems.productName,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const isDelivery = order.fulfillmentType === 'delivery';

  return send({
    to: order.customerEmail,
    subject: `Pedido #${order.orderNumber} confirmado · Amor a Mar`,
    idempotencyKey: `pedido-confirmado/${order.id}`,
    react: createElement(OrderConfirmed, {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      lines: items,
      subtotalCents: order.subtotalCents,
      deliveryFeeCents: order.deliveryFeeCents,
      totalCents: order.totalCents,
      fulfillment: isDelivery ? 'delivery' : 'pickup',
      deliveryAddress: isDelivery ? formatAddress(order) : null,
      orderUrl: `${origin}/pedido/${order.publicToken}`,
      assetsBaseUrl: origin,
      shopAddress: SHOP_ADDRESS,
      whatsappUrl: WHATSAPP_URL,
      whatsappLabel: WHATSAPP_LABEL,
    }),
  });
}
