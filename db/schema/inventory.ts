/**
 * INV — Inventory bounded context.
 *
 * E-Inventory: exactly one row per Product (INV-STK-04). Created when the
 * Product is created, at zero (HU-CAT-002).
 *
 * `available = on_hand - reserved` is derived and never stored (INV-STK-05):
 * persisting it would give two sources of truth that can disagree.
 */
import { pgTable, uuid, integer, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { products } from './catalog';

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
