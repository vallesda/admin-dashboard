/**
 * INV — Inventory bounded context.
 *
 * E-Inventory: exactly one row per Product (INV-STK-04). Created when the
 * Product is created, at zero (HU-CAT-002).
 *
 * `available = on_hand - reserved` is derived and never stored (INV-STK-05):
 * persisting it would give two sources of truth that can disagree.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  timestamp,
  text,
  bigserial,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { products } from './catalog';
import { adminUsers } from './identity';
import { orders } from './sales';

export const inventory = pgTable(
  'inventory',
  {
    // PK *is* the FK: one row per product, enforced by the primary key itself
    // rather than by a separate unique index (INV-STK-04).
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'restrict' }),
    onHand: integer('on_hand').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('inventory_on_hand_non_negative', sql`${table.onHand} >= 0`),
    check('inventory_reserved_non_negative', sql`${table.reserved} >= 0`),
    // RN-003 in the database: you can never reserve more than you hold, no
    // matter which code path writes the row.
    check(
      'inventory_reserved_within_on_hand',
      sql`${table.reserved} <= ${table.onHand}`,
    ),
  ],
);

export type InventoryRow = typeof inventory.$inferSelect;

/**
 * Why stock moved.
 *
 * `reserve`/`release`/`sale` are written by Sales, never by hand: they always
 * carry an `order_id`. `receive`/`adjustment` are the two an operator performs.
 */
export const movementTypeEnum = pgEnum('movement_type', [
  'receive',
  'adjustment',
  'reserve',
  'release',
  'sale',
]);

/**
 * E-InventoryMovement — the operational ledger.
 *
 * Append-only: rows are never edited or deleted (DOCS/MODELO-DATOS.md §1). A
 * correction is a new `adjustment`, so the history explains itself. Enforcement
 * is a trigger, added in the migration — see the note there for why a REVOKE
 * would not be enough.
 *
 * Two deltas rather than one quantity, because a `sale` moves `on_hand` and
 * `reserved` at the same time and by the same amount (INV-MOV-05). One column
 * could not express that.
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    type: movementTypeEnum('type').notNull(),

    onHandDelta: integer('on_hand_delta').notNull().default(0),
    reservedDelta: integer('reserved_delta').notNull().default(0),

    // Now that Sales exists, the reference is real: a movement can no longer
    // cite an order that was never placed.
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'restrict',
    }),
    note: text('note'),
    // SET NULL, not RESTRICT: removing an employee must never be blocked by
    // their history, and must never erase it either.
    createdBy: uuid('created_by').references(() => adminUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('inventory_movements_product_created_idx').on(
      table.productId,
      table.createdAt.desc(),
    ),
    index('inventory_movements_order_idx').on(table.orderId),
    index('inventory_movements_type_created_idx').on(
      table.type,
      table.createdAt.desc(),
    ),

    // The shape of each movement type is a database rule, so a bad write from
    // any code path is rejected rather than silently corrupting the ledger.
    check(
      'inventory_movements_not_empty',
      sql`${table.onHandDelta} <> 0 OR ${table.reservedDelta} <> 0`,
    ),
    check(
      'inventory_movements_receive_shape',
      sql`${table.type} <> 'receive' OR (${table.onHandDelta} > 0 AND ${table.reservedDelta} = 0)`,
    ),
    check(
      'inventory_movements_reserve_shape',
      sql`${table.type} <> 'reserve' OR (${table.onHandDelta} = 0 AND ${table.reservedDelta} > 0 AND ${table.orderId} IS NOT NULL)`,
    ),
    check(
      'inventory_movements_release_shape',
      sql`${table.type} <> 'release' OR (${table.onHandDelta} = 0 AND ${table.reservedDelta} < 0 AND ${table.orderId} IS NOT NULL)`,
    ),
    check(
      'inventory_movements_sale_shape',
      sql`${table.type} <> 'sale' OR (${table.onHandDelta} < 0 AND ${table.reservedDelta} = ${table.onHandDelta} AND ${table.orderId} IS NOT NULL)`,
    ),
    // A correction without an explanation is not auditable (INV-MOV-06).
    check(
      'inventory_movements_adjustment_note',
      sql`${table.type} <> 'adjustment' OR (${table.note} IS NOT NULL AND length(btrim(${table.note})) > 0)`,
    ),
  ],
);

export type InventoryMovementRow = typeof inventoryMovements.$inferSelect;
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
