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
import { createOrder } from '@/modules/sales/service';
import { createCustomer, findByPhone } from '@/modules/customers/service';
import { customerSchema } from '@/modules/customers/validators';
import { createOrderSchema } from '@/modules/sales/validators';

export const checkoutSchema = z.object({
  customer: customerSchema,
  fulfillmentType: z.enum(['pickup', 'delivery']),
  deliveryAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(1000),
      }),
    )
    .min(1, { message: 'El carrito está vacío.' }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CheckoutResult = {
  orderNumber: number;
  token: string;
};

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
      // Delivery pricing is not modelled yet; the storefront cannot invent one.
      deliveryFeeCents: 0,
      notes: input.notes,
      lines: input.lines,
    }),
    // No admin actor: nobody at the shop touched this order.
    null,
  );

  const [row] = await db
    .select({ publicToken: orders.publicToken })
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  return { orderNumber: order.orderNumber, token: row.publicToken };
}
