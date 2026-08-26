/**
 * SAL — Sales bounded context.
 *
 * E-Order and E-OrderItem. See DOCS/MODELO-DATOS.md §7–§9.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { customers } from './customers';
import { products } from './catalog';

/** Operational state: where the order is (DOCS §8). */
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]);

/**
 * Money state: where the payment is (DOCS §9).
 *
 * A separate machine from `status` on purpose (RN-006, INV-ORD-07). Marking an
 * order paid must not advance it operationally, and completing it must not
 * claim it was charged.
 */
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  'paid',
  'refunded',
]);

export const fulfillmentTypeEnum = pgEnum('fulfillment_type', [
  'pickup',
  'delivery',
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Human-facing identity: "pedido 1043" is what staff and customer say on
    // the phone. The uuid is for the system, never for a person.
    orderNumber: bigint('order_number', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .notNull(),

    /**
     * Opaque handle for the public order-confirmation page.
     *
     * `orderNumber` is sequential, so a confirmation URL built on it would let
     * anyone iterate 1, 2, 3… and read every customer's name, phone and
     * address. The number stays the thing people say out loud; this is the
     * thing that goes in a URL.
     */
    publicToken: uuid('public_token').notNull().defaultRandom().unique(),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    status: orderStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('unpaid'),
    fulfillmentType: fulfillmentTypeEnum('fulfillment_type')
      .notNull()
      .default('pickup'),

    // Contact snapshot. Editing the Customer later must not rewrite who was
    // called for a past order (INV-CUS-03).
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),
    deliveryAddress: text('delivery_address'),

    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_order_number_idx').on(table.orderNumber),
    index('orders_status_created_idx').on(table.status, table.createdAt.desc()),
    index('orders_payment_created_idx').on(
      table.paymentStatus,
      table.createdAt.desc(),
    ),
    index('orders_customer_created_idx').on(
      table.customerId,
      table.createdAt.desc(),
    ),
    index('orders_created_id_idx').on(table.createdAt.desc(), table.id),

    check(
      'orders_amounts_non_negative',
      sql`${table.subtotalCents} >= 0 AND ${table.deliveryFeeCents} >= 0 AND ${table.totalCents} >= 0`,
    ),
    // The total is arithmetic, not an opinion (INV-ORD-02). A client that posts
    // its own total cannot make it stick (RN-008).
    check(
      'orders_total_is_sum',
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.deliveryFeeCents}`,
    ),
    check(
      'orders_delivery_needs_address',
      sql`${table.fulfillmentType} <> 'delivery' OR (${table.deliveryAddress} IS NOT NULL AND length(btrim(${table.deliveryAddress})) > 0)`,
    ),
    // Timestamps and status cannot disagree (INV-ORD-05, INV-ORD-06): a
    // completed order has a completion time, and only a completed order does.
    check(
      'orders_completed_at_matches_status',
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      'orders_cancelled_at_matches_status',
      sql`(${table.status} = 'cancelled') = (${table.cancelledAt} IS NOT NULL)`,
    ),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    // RESTRICT: a product that has been sold cannot be deleted (RN-007). It is
    // archived instead.
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    // Price/name snapshot (RN-005, INV-ITM-04). Changing the catalogue tomorrow
    // must not rewrite what was sold today.
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 64 }).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [
    index('order_items_order_idx').on(table.orderId),
    index('order_items_product_idx').on(table.productId),

    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check('order_items_price_positive', sql`${table.unitPriceCents} > 0`),
    check(
      'order_items_line_total_is_product',
      sql`${table.lineTotalCents} = ${table.unitPriceCents} * ${table.quantity}`,
    ),
  ],
);

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type FulfillmentType = (typeof fulfillmentTypeEnum.enumValues)[number];
