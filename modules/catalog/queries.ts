import 'server-only';

/**
 * CAT — Category read models.
 *
 * Reads only. Anything that changes state belongs in `service.ts`.
 */
import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { categories, type CategoryRow } from '@/db/schema/catalog';

/** Shape the admin list needs. Kept narrow so the table can't drift. */
export type CategoryListItem = Pick<
  CategoryRow,
  'id' | 'name' | 'slug' | 'sortOrder' | 'active'
>;

/** Option shape for the Product form's category selector (HU-CAT-001). */
export type CategoryOption = Pick<CategoryRow, 'id' | 'name'>;

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
 * Categories selectable when creating or editing a Product.
 *
 * Only `active` ones: an inactive category must not be assignable to new
 * products, otherwise deactivating it would mean nothing.
 */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}
