import 'server-only';

/**
 * CAT — Category use cases.
 *
 * Realiza: RF-CAT-001 · HU-CAT-001.
 *
 * Business rules live here, not in a React component and not in the action
 * adapter (DOCS/README.md, regla de gobierno 2). This file must not import
 * React or anything from `next/`.
 */
import { eq, and, ne, asc } from 'drizzle-orm';

import { db } from '@/db';
import { categories, type CategoryRow } from '@/db/schema/catalog';
import { ConflictError, NotFoundError, isUniqueViolation } from '@/lib/errors';
import {
  slugify,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './validators';

const SLUG_UNIQUE_CONSTRAINT = 'categories_slug_unique';

const SLUG_TAKEN = () =>
  new ConflictError(
    'category.slug_taken',
    'Ya existe una categoría con esa URL. Elige otra.',
    'slug',
  );

/**
 * Creates a category.
 *
 * `slug` is derived from the name when omitted. Uniqueness is checked up front
 * so the admin gets a field-level message, but the unique index is still the
 * authority: two concurrent creates can both pass the pre-check, and the
 * catch below turns that race into the same domain error rather than a 500.
 */
export async function createCategory(
  input: CreateCategoryInput,
): Promise<CategoryRow> {
  const slug = input.slug ?? slugify(input.name);

  if (slug.length < 2) {
    throw new ConflictError(
      'category.slug_underivable',
      'No se pudo generar una URL a partir del nombre. Escríbela a mano.',
      'slug',
    );
  }

  if (await slugExists(slug)) throw SLUG_TAKEN();

  try {
    const [row] = await db
      .insert(categories)
      .values({
        name: input.name,
        slug,
        sortOrder: input.sortOrder,
        active: input.active,
      })
      .returning();

    return row;
  } catch (error) {
    if (isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) throw SLUG_TAKEN();
    throw error;
  }
}

/**
 * Updates a category.
 *
 * `updatedAt` is set explicitly: the column default only fires on insert, so
 * without this an edit would keep the original timestamp.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryRow> {
  if (await slugExists(input.slug, id)) throw SLUG_TAKEN();

  try {
    const [row] = await db
      .update(categories)
      .set({
        name: input.name,
        slug: input.slug,
        sortOrder: input.sortOrder,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    if (!row) throw new NotFoundError('la categoría', id);

    return row;
  } catch (error) {
    if (isUniqueViolation(error, SLUG_UNIQUE_CONSTRAINT)) throw SLUG_TAKEN();
    throw error;
  }
}

/**
 * Activates or deactivates a category.
 *
 * Deactivating is the MVP's substitute for deleting: `RF-CAT-001` only asks for
 * an active flag, and an inactive category keeps its products' `category_id`
 * intact. Public navigation must filter on `active` (HU-CAT-001).
 */
export async function setCategoryActive(
  id: string,
  active: boolean,
): Promise<CategoryRow> {
  const [row] = await db
    .update(categories)
    .set({ active, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  if (!row) throw new NotFoundError('la categoría', id);

  return row;
}

/** Whether `slug` is taken, optionally ignoring one category (for edits). */
async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const where = exceptId
    ? and(eq(categories.slug, slug), ne(categories.id, exceptId))
    : eq(categories.slug, slug);

  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(where)
    .limit(1);

  return row !== undefined;
}

/**
 * Suggests a free slug derived from `name` — `atun`, `atun-2`, `atun-3`…
 *
 * Advisory only: the form uses it to prefill, and creation still validates.
 */
export async function suggestSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) return '';

  const taken = await db
    .select({ slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.slug));

  const used = new Set(taken.map((r) => r.slug));
  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`.slice(0, 140);
    if (!used.has(candidate)) return candidate;
  }

  return '';
}
