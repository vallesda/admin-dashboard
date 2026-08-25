/**
 * SAL — input validation.
 *
 * Note what is NOT here: prices and totals. The client never sends them
 * (RN-008); the service reads the current catalogue price and computes the
 * total itself. Accepting a price from the form would let a crafted POST set
 * its own.
 */
import { z } from 'zod';

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
    deliveryAddress: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        const s = typeof v === 'string' ? v.trim() : '';
        return s === '' ? null : s;
      }),
    deliveryFeeCents: z.coerce
      .number({ invalid_type_error: 'El costo de envío debe ser un número.' })
      .int()
      .min(0, { message: 'El costo de envío no puede ser negativo.' })
      .default(0),
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
    if (data.fulfillmentType === 'delivery' && data.deliveryAddress === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryAddress'],
        message: 'Una entrega a domicilio necesita dirección.',
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
