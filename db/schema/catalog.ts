/**
 * CAT — Catalog bounded context.
 *
 * Realiza: RF-CAT-001 (categorías planas), E-Category.
 * Ver DOCS/MODELO-DATOS.md §4.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    // Business identifier: what the storefront URL will be built from, so it
    // has to stay unique even across inactive categories.
    slug: varchar('slug', { length: 140 }).notNull().unique(),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The admin list and the future storefront nav both read in this order.
    // Not in DOCS §12's minimum set, but the ordering is the only way this
    // table is ever read, and it costs one small index on a tiny table.
    index('categories_sort_order_idx').on(table.sortOrder, table.name),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;

/** How the product is sold. `pack` carries a net weight; `piece` need not. */
export const unitTypeEnum = pgEnum('unit_type', ['piece', 'pack']);

/**
 * Lifecycle of a sellable product.
 *
 * `draft` is the entry state (HU-CAT-002), `active` is the only sellable one
 * (RF-CAT-007 / INV-PRO-06), and `archived` retires it without deleting history
 * (RN-007).
 */
export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
]);

/**
 * E-Product — the sellable SKU itself.
 *
 * RN-001: a Product *is* a SKU. There is no ProductVariant in the MVP;
 * "Salmón 500 g" and "Salmón 1 kg" are two Products.
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // RESTRICT, not CASCADE: deleting a category must never silently delete the
    // products filed under it. Nullable so a product can exist uncategorised.
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'restrict',
    }),
    sku: varchar('sku', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),

    priceCents: integer('price_cents').notNull(),
    costCents: integer('cost_cents'),

    imageUrl: text('image_url'),
    unitType: unitTypeEnum('unit_type').notNull(),
    netWeightGrams: integer('net_weight_grams'),

    status: productStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('products_status_idx').on(table.status),
    index('products_category_status_idx').on(table.categoryId, table.status),
    // Plain btree for now. DOCS §12 is explicit: no pg_trgm until volume
    // justifies it.
    index('products_name_idx').on(table.name),

    // The invariants live in the database, not only in the service, so a bad
    // write from anywhere is rejected.
    check('products_price_positive', sql`${table.priceCents} > 0`),
    check(
      'products_cost_non_negative',
      sql`${table.costCents} IS NULL OR ${table.costCents} >= 0`,
    ),
    check(
      'products_net_weight_positive',
      sql`${table.netWeightGrams} IS NULL OR ${table.netWeightGrams} > 0`,
    ),
  ],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type UnitType = (typeof unitTypeEnum.enumValues)[number];
