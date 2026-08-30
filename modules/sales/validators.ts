/**
 * SAL — input validation.
 *
 * Note what is NOT here: prices and totals. The client never sends them
 * (RN-008); the service reads the current catalogue price and computes the
 * total itself. Accepting a price from the form would let a crafted POST set
 * its own.
 */
import { z } from 'zod';

import { deliveryAddressSchema } from './address';

const orderLine = z.object({
  productId: z.string().uuid({ message: 'Producto inválido.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'La cantidad debe ser un número.' })
    .int({ message: 'La cantidad debe ser un número entero.' })
    .positive({ message: 'La cantidad debe ser mayor a 0.' })
    .max(10_000, { message: 'La cantidad es demasiado alta.' }),
});

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid({ message: 'Selecciona un cliente.' }),
    fulfillmentType: z.enum(['pickup', 'delivery'], {
      invalid_type_error: 'Selecciona cómo se entrega el pedido.',
      required_error: 'Selecciona cómo se entrega el pedido.',
    }),
    // How this order was agreed to be paid, not how it was paid. Defaults to
    // `on_site` because that is what an order taken at the counter or over the
    // phone is, and those are the ones created without this field.
    paymentMode: z.enum(['online', 'on_site']).default('on_site'),
    /**
     * The address in parts, present only for a delivery.
     *
     * Optional at this level and required by the refinement below, so a pickup
     * order does not have to send an empty object and a delivery cannot get
     * away without one.
     */
    deliveryAddress: deliveryAddressSchema.optional().nullable(),
    /**
     * Perdonar el envío, con motivo. Sólo `admin` (la acción lo verifica).
     *
     * Ya no existe un campo `deliveryFeeCents` de entrada. El costo lo cotiza
     * el servidor desde el código postal (`DEL`), igual que el precio de los
     * productos sale del catálogo: es `RN-008` aplicado al envío. Un campo de
     * importe aquí sería exactamente el agujero que `RN-008` existe para cerrar.
     */
    waiveDeliveryFeeNote: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        const s = typeof v === 'string' ? v.trim() : '';
        return s === '' ? null : s;
      })
      .refine((v) => v === null || v.length >= 4, {
        message: 'Escribe por qué se perdona el envío.',
      })
      .refine((v) => v === null || v.length <= 500, {
        message: 'El motivo no puede pasar de 500 caracteres.',
      }),
    notes: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        const s = typeof v === 'string' ? v.trim() : '';
        return s === '' ? null : s;
      }),
    lines: z
      .array(orderLine)
      .min(1, { message: 'Agrega al menos un producto al pedido.' }),
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
     * Cash is only collected across the counter.
     *
     * The shop offers exactly two ways to pay: cash when you come and pick the
     * order up, or online — and an online order can be delivered or collected.
     * Paying the driver is not on offer: putting product on a motorbike against
     * a promise is the one combination whose downside lands entirely on the
     * shop.
     *
     * Checked here *and* by a CHECK constraint. A Server Action is a public
     * POST endpoint, and this is the rule with money behind it.
     */
    if (data.paymentMode === 'on_site' && data.fulfillmentType === 'delivery') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMode'],
        message:
          'Los pedidos a domicilio se pagan en línea. El pago en efectivo es sólo al recoger en la tienda.',
      });
    }

    // Two lines for the same product would produce two reservations for one
    // item and a confusing order. Merging silently would hide a mistake, so
    // reject and let the operator fix it.
    const seen = new Set<string>();
    for (const line of data.lines) {
      if (seen.has(line.productId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lines'],
          message: 'Hay un producto repetido. Súmalo en una sola línea.',
        });
        return;
      }
      seen.add(line.productId);
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
