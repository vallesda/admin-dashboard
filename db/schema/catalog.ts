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
  unique,
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

    /*
     * Merchandising, for the storefront's home shelf.
     *
     * A category is a filter; these three fields are what let one also be
     * *presented* — a photograph, a line saying what it is for, and a flag the
     * shop raises to put it on the homepage. Without them the shelf could only
     * ever show a name, and a name is not an invitation.
     */
    imageUrl: text('image_url'),
    tagline: varchar('tagline', { length: 160 }),
    isFeatured: boolean('is_featured').notNull().default(false),

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

/**
 * How the product is sold.
 *
 * `pack` carries a net weight; `piece` need not. `kg` was added for the
 * storefront: seafood is routinely priced per kilo, and forcing it into `pack`
 * would mean inventing a package that does not exist.
 */
export const unitTypeEnum = pgEnum('unit_type', ['piece', 'pack', 'kg']);

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

    // ---- Storefront presentation ----
    //
    // Added for the public catalogue (RF-TDA-002): the product page has to
    // answer "what is it, how is it cut, where is it from" above the fold, and
    // none of that was expressible before. All nullable — the admin can fill
    // them in gradually, and a product without them still sells.
    shortDescription: text('short_description'),
    /** Where it was caught or farmed: "Ensenada, B.C." */
    origin: text('origin'),
    /** How it is cut: "Filete sin piel", "Entero limpio". */
    presentation: text('presentation'),
    storageInstructions: text('storage_instructions'),
    preparationSuggestions: text('preparation_suggestions').array(),
    /** Merchandising flags the storefront reads; not business rules. */
    isFeatured: boolean('is_featured').notNull().default(false),
    isSeasonal: boolean('is_seasonal').notNull().default(false),
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

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------

/**
 * A curated bundle: everything needed for one dish, in one place.
 *
 * The storefront used to carry four of these as a hardcoded list in
 * `lib/occasions.ts` — Sashimi, Ceviche, Parrilla, Cena para dos — with no data
 * behind them, so their pages showed the whole catalogue under an apology. They
 * are rows now, and the shop curates them.
 *
 * A package has **no price of its own**. Its total is the sum of the lines it
 * contains, recomputed server-side from the catalogue at checkout like every
 * other total (RN-008). Giving it a stored price would create a second pricing
 * path and the first place where what a shopper is charged could drift from
 * what the product costs.
 */
export const packages = pgTable(
  'packages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    // The storefront URL is built from this, so it stays unique even across
    // inactive packages — the same rule categories follow.
    slug: varchar('slug', { length: 140 }).notNull().unique(),
    tagline: varchar('tagline', { length: 160 }),
    description: text('description'),
    imageUrl: text('image_url'),
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
    index('packages_sort_order_idx').on(table.sortOrder, table.name),
  ],
);

/**
 * One product inside a package, with how many of it the dish needs.
 *
 * `onDelete: cascade` from the package: deleting a bundle should not leave its
 * lines behind. `restrict` from the product: a product that is part of a
 * published package must not vanish underneath it — the same protection
 * categories already give.
 */
export const packageItems = pgTable(
  'package_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('package_items_package_idx').on(table.packageId, table.sortOrder),
    // A product appears at most once per package: two rows for the same piece
    // is a quantity, not two lines, and letting both exist makes the total
    // depend on how the admin happened to enter it.
    unique('package_items_unique_product').on(table.packageId, table.productId),
    check('package_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export type PackageRow = typeof packages.$inferSelect;
export type NewPackageRow = typeof packages.$inferInsert;
export type PackageItemRow = typeof packageItems.$inferSelect;
