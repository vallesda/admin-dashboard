import 'server-only';

/**
 * SAL — Order use cases.
 *
 * Realiza: RF-SAL-001…006 · HU-SAL-001.
 *
 * This is where Sales and Inventory meet. Everything an order does to stock
 * happens in the same transaction that writes the order (RN-004, RNF-DAT-002):
 * a reservation with no order, or an order with no reservation, would both be
 * corruption nobody could explain afterwards.
 */
import { eq, inArray, sql as raw } from 'drizzle-orm';

import { db } from '@/db';
import { products } from '@/db/schema/catalog';
import { customers } from '@/db/schema/customers';
import { inventory, inventoryMovements } from '@/db/schema/inventory';
import { orders, orderItems, type OrderRow } from '@/db/schema/sales';
import { DomainError, NotFoundError } from '@/lib/errors';
import type { CreateOrderInput } from './validators';

/**
 * Creates an order and reserves its stock, atomically.
 *
 * Prices come from the catalogue, never from the caller (RN-008). The client
 * sends product ids and quantities; the total is arithmetic done here and
 * re-checked by a database CHECK.
 */
export async function createOrder(
  input: CreateOrderInput,
  actorId: string | null,
): Promise<OrderRow> {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) throw new NotFoundError('el cliente', input.customerId);

    const productIds = input.lines.map((l) => l.productId);

    // Lock the inventory rows for every product in the order, in one statement
    // ordered by id. Locking in a consistent order is what stops two concurrent
    // orders for the same two products from deadlocking each other.
    const stock = await tx
      .select({
        productId: inventory.productId,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
      })
      .from(inventory)
      .where(inArray(inventory.productId, productIds))
      .orderBy(inventory.productId)
      .for('update');

    const stockByProduct = new Map(stock.map((s) => [s.productId, s]));

    const catalogue = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        priceCents: products.priceCents,
        status: products.status,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productById = new Map(catalogue.map((p) => [p.id, p]));

    const items: {
      productId: string;
      productName: string;
      sku: string;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }[] = [];

    for (const line of input.lines) {
      const product = productById.get(line.productId);

      if (!product) throw new NotFoundError('el producto', line.productId);

      // Only `active` products can enter a new order (RF-CAT-007, INV-PRO-06).
      if (product.status !== 'active') {
        throw new DomainError(
          'order.product_not_sellable',
          `“${product.name}” no está activo y no se puede vender.`,
          'lines',
        );
      }

      const balance = stockByProduct.get(line.productId);

      if (!balance) {
        throw new DomainError(
          'order.no_inventory',
          `“${product.name}” no tiene inventario inicializado.`,
          'lines',
        );
      }

      const available = balance.onHand - balance.reserved;

      if (line.quantity > available) {
        throw new DomainError(
          'order.insufficient_stock',
          `Solo hay ${available} de “${product.name}” disponibles.`,
          'lines',
        );
      }

      items.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        lineTotalCents: product.priceCents * line.quantity,
      });
    }

    const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);

    const [order] = await tx
      .insert(orders)
      .values({
        customerId: customer.id,
        // Contact snapshot: editing the customer later must not rewrite who was
        // called for this order (INV-CUS-03).
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        fulfillmentType: input.fulfillmentType,
        deliveryAddress: input.deliveryAddress,
        subtotalCents,
        deliveryFeeCents: input.deliveryFeeCents,
        totalCents: subtotalCents + input.deliveryFeeCents,
        notes: input.notes,
      })
      .returning();

    await tx.insert(orderItems).values(
      items.map((i) => ({ orderId: order.id, ...i })),
    );

    for (const item of items) {
      await tx
        .update(inventory)
        .set({
          reserved: raw`${inventory.reserved} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, item.productId));

      await tx.insert(inventoryMovements).values({
        productId: item.productId,
        type: 'reserve',
        onHandDelta: 0,
        // Reserving does not move goods: they are still in the cold room, just
        // promised. Only `available` drops.
        reservedDelta: item.quantity,
        orderId: order.id,
        createdBy: actorId,
      });
    }

    return order;
  });
}
