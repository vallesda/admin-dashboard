/**
 * CAT — Catalog bounded context.
 *
 * Realiza: RF-CAT-001 (categorías planas), E-Category.
 * Ver DOCS/MODELO-DATOS.md §4.
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

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
