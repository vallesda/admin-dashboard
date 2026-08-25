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
import {
  orders,
  orderItems,
  type OrderRow,
  type OrderStatus,
  type PaymentStatus,
} from '@/db/schema/sales';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  canTransition,
  canTransitionPayment,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from './state-machine';
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

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/**
 * Moves an order to `next`, applying that transition's effect on Inventory.
 *
 * One entry point for all eight transitions rather than a method per verb: the
 * legality check, the stock effect and the timestamp then live together and
 * cannot drift apart. Everything runs in one transaction (RN-004).
 *
 * Effects (DOCS §8):
 *   completed → each reservation becomes a sale
 *   cancelled → each reservation is released
 *   everything else → status only
 */
export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
  actorId: string | null,
): Promise<OrderRow> {
  return db.transaction(async (tx) => {
    // Lock the order first: two staff members clicking "Completar" at the same
    // moment must not both convert the same reservation into a sale.
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update')
      .limit(1);

    if (!order) throw new NotFoundError('el pedido', orderId);

    if (order.status === next) {
      // Idempotent: re-confirming a confirmed order is not an error, and it
      // must not run the stock effect a second time.
      return order;
    }

    if (!canTransition(order.status, next)) {
      throw new DomainError(
        'order.illegal_transition',
        `Un pedido ${ORDER_STATUS_LABEL[order.status].toLowerCase()} no puede pasar a ${ORDER_STATUS_LABEL[next].toLowerCase()}.`,
      );
    }

    if (next === 'completed') {
      await convertReservationsToSale(tx, order.id, actorId);
    } else if (next === 'cancelled') {
      await releaseReservations(tx, order.id, actorId);
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: next,
        updatedAt: new Date(),
        // The CHECK constraints require timestamp and status to agree
        // (INV-ORD-05, INV-ORD-06), so they are set in the same statement.
        completedAt: next === 'completed' ? new Date() : null,
        cancelledAt: next === 'cancelled' ? new Date() : null,
      })
      .where(eq(orders.id, order.id))
      .returning();

    return updated;
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * `ready → completed`: the goods leave (RF-INV-007).
 *
 * One `sale` movement per line, carrying both deltas: `on_hand` drops because
 * the fish physically left, and `reserved` drops because the promise was kept.
 * The ledger CHECK requires them to be equal and negative (INV-MOV-05).
 */
async function convertReservationsToSale(
  tx: Tx,
  orderId: string,
  actorId: string | null,
): Promise<void> {
  const lines = await tx
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines) {
    await tx
      .update(inventory)
      .set({
        onHand: raw`${inventory.onHand} - ${line.quantity}`,
        reserved: raw`${inventory.reserved} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, line.productId));

    await tx.insert(inventoryMovements).values({
      productId: line.productId,
      type: 'sale',
      onHandDelta: -line.quantity,
      reservedDelta: -line.quantity,
      orderId,
      createdBy: actorId,
    });
  }
}

/**
 * Cancelling an open order gives the units back (RF-INV-006).
 *
 * Only `reserved` moves: nothing ever left the cold room, so `on_hand` is
 * untouched. Cancelling is only reachable from a state that still holds a
 * reservation, which is why there is no "was it already sold?" branch here —
 * `completed` has no outgoing transition at all.
 */
async function releaseReservations(
  tx: Tx,
  orderId: string,
  actorId: string | null,
): Promise<void> {
  const lines = await tx
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines) {
    await tx
      .update(inventory)
      .set({
        reserved: raw`${inventory.reserved} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, line.productId));

    await tx.insert(inventoryMovements).values({
      productId: line.productId,
      type: 'release',
      onHandDelta: 0,
      reservedDelta: -line.quantity,
      orderId,
      createdBy: actorId,
    });
  }
}

/**
 * Moves the payment machine, which is independent of the operational one
 * (RN-006, INV-ORD-07).
 *
 * Marking an order paid does not advance it, and completing it does not claim
 * it was charged. Touching Inventory from here would be a category error: money
 * moving is not goods moving.
 */
export async function changePaymentStatus(
  orderId: string,
  next: PaymentStatus,
): Promise<OrderRow> {
  const [order] = await db
    .select({ id: orders.id, paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new NotFoundError('el pedido', orderId);

  if (order.paymentStatus === next) {
    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    return row;
  }

  if (!canTransitionPayment(order.paymentStatus, next)) {
    throw new DomainError(
      'order.illegal_payment_transition',
      `Un pago ${PAYMENT_STATUS_LABEL[order.paymentStatus].toLowerCase()} no puede pasar a ${PAYMENT_STATUS_LABEL[next].toLowerCase()}.`,
    );
  }

  const [updated] = await db
    .update(orders)
    .set({ paymentStatus: next, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}
