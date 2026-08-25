import 'server-only';

/**
 * CAT — Category read models.
 *
 * Reads only. Anything that changes state belongs in `service.ts`.
 */
import { asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import {
  categories,
  products,
  type CategoryRow,
  type ProductRow,
  type ProductStatus,
  type UnitType,
} from '@/db/schema/catalog';
import { inventory } from '@/db/schema/inventory';

/** Shape the admin list needs. Kept narrow so the table can't drift. */
export type CategoryListItem = Pick<
  CategoryRow,
  'id' | 'name' | 'slug' | 'sortOrder' | 'active'
>;

/** Option shape for the Product form's category selector (HU-CAT-001). */
export type CategoryOption = Pick<CategoryRow, 'id' | 'name' | 'active'>;

/**
 * Every category, active first by explicit order.
 *
 * Not paginated on purpose: a flat category list for one fish shop is tens of
 * rows, and paginating it would add URL state for no benefit. Products do need
 * pagination (RF-CAT-004) — categories do not.
 */
export async function listCategories(): Promise<CategoryListItem[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      active: categories.active,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryById(
  id: string,
): Promise<CategoryRow | undefined> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return row;
}

/**
 * Categories for the Product form's selector, active flag included.
 *
 * This used to filter to `active` only, which caused two problems the caller
 * could not see:
 *
 *   1. Editing a product filed under a category that had since been
 *      deactivated silently dropped it — the select had no matching option, so
 *      it fell back to "Sin categoría" and saving wiped the assignment.
 *   2. With every category deactivated, the form said "no hay categorías"
 *      when several existed, sending the user off to create a duplicate.
 *
 * The filtering is now the form's job: it offers the active ones, keeps an
 * inactive one visible when it is the product's current category, and can say
 * how many are inactive.
 */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      active: categories.active,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/** Page size for the admin product list (RF-CAT-004). */
export const PRODUCTS_PER_PAGE = 10;

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  status: ProductStatus;
  unitType: UnitType;
  netWeightGrams: number | null;
  imageUrl: string | null;
  categoryName: string | null;
  onHand: number;
  reserved: number;
  /** Derived, never stored (INV-STK-05). */
  available: number;
};

/**
 * Search across name and SKU.
 *
 * Empty query returns undefined so the caller omits the WHERE entirely rather
 * than running `ILIKE '%%'` against every row — that is the mistake the legacy
 * invoice query makes.
 */
function productSearch(query: string): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;

  const pattern = `%${trimmed}%`;
  return or(ilike(products.name, pattern), ilike(products.sku, pattern));
}

/**
 * One page of products, with their stock and category name.
 *
 * Returns rows *and* total in a single round trip via `COUNT(*) OVER ()`: the
 * legacy invoice list runs the same WHERE twice (once to count, once to fetch),
 * which is DT-002. Doing it here from the start avoids inheriting that.
 */
export async function listProducts(
  query: string,
  page: number,
): Promise<{ items: ProductListItem[]; total: number; totalPages: number }> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const offset = (safePage - 1) * PRODUCTS_PER_PAGE;
  const where = productSearch(query);

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      priceCents: products.priceCents,
      status: products.status,
      unitType: products.unitType,
      netWeightGrams: products.netWeightGrams,
      imageUrl: products.imageUrl,
      categoryName: categories.name,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(products)
    // LEFT: a product may be uncategorised, and its inventory row is created
    // with it but a LEFT join keeps the list readable if one is ever missing.
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(where)
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(PRODUCTS_PER_PAGE)
    .offset(offset);

  const total = rows[0]?.total ?? 0;

  return {
    items: rows.map(({ total: _total, onHand, reserved, ...rest }) => ({
      ...rest,
      onHand: onHand ?? 0,
      reserved: reserved ?? 0,
      available: (onHand ?? 0) - (reserved ?? 0),
    })),
    total,
    totalPages: Math.ceil(total / PRODUCTS_PER_PAGE),
  };
}

export async function getProductById(
  id: string,
): Promise<ProductRow | undefined> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return row;
}

/** Products a new Order may reference: only `active` (RF-CAT-007, INV-PRO-06). */
export async function listSellableProducts(): Promise<
  Pick<ProductRow, 'id' | 'sku' | 'name' | 'priceCents'>[]
> {
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      priceCents: products.priceCents,
    })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(asc(products.name));
}
