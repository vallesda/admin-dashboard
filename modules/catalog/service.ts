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
import {
  categories,
  products,
  packages,
  packageItems,
  type CategoryRow,
  type ProductRow,
  type ProductStatus,
  type PackageRow,
} from '@/db/schema/catalog';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  isUniqueViolation,
} from '@/lib/errors';
import { initializeInventory } from '@/modules/inventory/service';
import { deleteBlobQuietly } from '@/lib/blob';
import {
  slugify,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateProductInput,
  type UpdateProductInput,
  type CreatePackageInput,
  type UpdatePackageInput,
  type PackageItemInput,
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
        tagline: input.tagline,
        imageUrl: input.imageUrl,
        isFeatured: input.isFeatured,
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
        tagline: input.tagline,
        imageUrl: input.imageUrl,
        isFeatured: input.isFeatured,
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

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

const SKU_UNIQUE_CONSTRAINT = 'products_sku_unique';
const PRODUCT_SLUG_UNIQUE_CONSTRAINT = 'products_slug_unique';

const SKU_TAKEN = () =>
  new ConflictError(
    'product.sku_taken',
    'Ya existe un producto con ese SKU.',
    'sku',
  );

const PRODUCT_SLUG_TAKEN = () =>
  new ConflictError(
    'product.slug_taken',
    'Ya existe un producto con esa URL. Elige otra.',
    'slug',
  );

/** Turns a unique violation into the right field error, or rethrows. */
function rethrowProductConflict(error: unknown): never {
  if (isUniqueViolation(error, SKU_UNIQUE_CONSTRAINT)) throw SKU_TAKEN();
  if (isUniqueViolation(error, PRODUCT_SLUG_UNIQUE_CONSTRAINT)) {
    throw PRODUCT_SLUG_TAKEN();
  }
  throw error;
}

/**
 * Creates a Product and its zero Inventory row, atomically.
 *
 * The two writes share a transaction because a Product without an Inventory row
 * violates INV-STK-04 and would make every stock read a special case
 * (HU-CAT-002: "queda draft y posee Inventory en cero").
 *
 * The row is always born `draft`: publishing is a separate, deliberate act
 * (RF-CAT-005), so a half-filled product can never be sellable by accident.
 */
export async function createProduct(
  input: CreateProductInput,
): Promise<ProductRow> {
  const slug = input.slug ?? slugify(input.name);

  if (slug.length < 2) {
    throw new ConflictError(
      'product.slug_underivable',
      'No se pudo generar una URL a partir del nombre. Escríbela a mano.',
      'slug',
    );
  }

  if (await productSkuExists(input.sku)) throw SKU_TAKEN();
  if (await productSlugExists(slug)) throw PRODUCT_SLUG_TAKEN();

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({
          sku: input.sku,
          name: input.name,
          slug,
          description: input.description,
          categoryId: input.categoryId,
          priceCents: input.priceCents,
          costCents: input.costCents,
          imageUrl: input.imageUrl,
          unitType: input.unitType,
          netWeightGrams: input.netWeightGrams,
          status: 'draft',
        })
        .returning();

      // Owned by the Inventory context; called, not inlined.
      await initializeInventory(tx, row.id);

      return row;
    });
  } catch (error) {
    rethrowProductConflict(error);
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductRow> {
  if (await productSkuExists(input.sku, id)) throw SKU_TAKEN();
  if (await productSlugExists(input.slug, id)) throw PRODUCT_SLUG_TAKEN();

  // Read the outgoing image before overwriting it, so a replaced or cleared
  // photo can be removed from Blob afterwards. Without this every edit would
  // leave a file nobody references and nobody pays attention to.
  const [previous] = await db
    .select({ imageUrl: products.imageUrl })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  try {
    const [row] = await db
      .update(products)
      .set({
        sku: input.sku,
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        costCents: input.costCents,
        imageUrl: input.imageUrl,
        unitType: input.unitType,
        netWeightGrams: input.netWeightGrams,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!row) throw new NotFoundError('el producto', id);

    // After the row is safely written, not before: losing the old file while
    // the update fails would leave a product pointing at nothing.
    if (previous?.imageUrl && previous.imageUrl !== row.imageUrl) {
      await deleteBlobQuietly(previous.imageUrl);
    }

    return row;
  } catch (error) {
    rethrowProductConflict(error);
  }
}

/**
 * Legal status transitions (RF-CAT-005, RF-CAT-006, RN-007, INV-PRO-05).
 *
 * `archived` is deliberately not terminal-forever: an admin can bring a product
 * back to `draft`, which forces a second, explicit publish before it can sell
 * again. What it must never do is jump straight from `archived` to `active`.
 */
const LEGAL_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active', 'archived'],
  active: ['draft', 'archived'],
  archived: ['draft'],
};

export async function changeProductStatus(
  id: string,
  next: ProductStatus,
): Promise<ProductRow> {
  const current = await getProductStatus(id);

  if (current === undefined) throw new NotFoundError('el producto', id);

  if (current === next) {
    // Idempotent: re-publishing a published product is not an error.
    const row = await findProduct(id);
    if (!row) throw new NotFoundError('el producto', id);
    return row;
  }

  if (!LEGAL_TRANSITIONS[current].includes(next)) {
    throw new DomainError(
      'product.illegal_transition',
      `Un producto ${STATUS_LABEL[current]} no puede pasar a ${STATUS_LABEL[next]}.`,
    );
  }

  const [row] = await db
    .update(products)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  return row;
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'borrador',
  active: 'activo',
  archived: 'archivado',
};

async function getProductStatus(
  id: string,
): Promise<ProductStatus | undefined> {
  const [row] = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return row?.status;
}

async function findProduct(id: string): Promise<ProductRow | undefined> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return row;
}

async function productSkuExists(sku: string, exceptId?: string) {
  const where = exceptId
    ? and(eq(products.sku, sku), ne(products.id, exceptId))
    : eq(products.sku, sku);

  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(where)
    .limit(1);

  return row !== undefined;
}

async function productSlugExists(slug: string, exceptId?: string) {
  const where = exceptId
    ? and(eq(products.slug, slug), ne(products.id, exceptId))
    : eq(products.slug, slug);

  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(where)
    .limit(1);

  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------------

const PACKAGE_SLUG_TAKEN = () =>
  new ConflictError(
    'package.slug_taken',
    'Ya existe un paquete con esa URL.',
    'slug',
  );

async function packageSlugExists(slug: string, exceptId?: string) {
  const [row] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(
      exceptId
        ? and(eq(packages.slug, slug), ne(packages.id, exceptId))
        : eq(packages.slug, slug),
    )
    .limit(1);

  return row !== undefined;
}

export async function createPackage(
  input: CreatePackageInput,
): Promise<PackageRow> {
  const slug = input.slug ?? slugify(input.name);

  if (slug.length < 2) {
    throw new ConflictError(
      'package.slug_underivable',
      'No se pudo generar una URL a partir del nombre. Escríbela a mano.',
      'slug',
    );
  }

  if (await packageSlugExists(slug)) throw PACKAGE_SLUG_TAKEN();

  const [row] = await db
    .insert(packages)
    .values({
      name: input.name,
      slug,
      tagline: input.tagline,
      description: input.description,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      active: input.active,
    })
    .returning();

  return row;
}

export async function updatePackage(
  id: string,
  input: UpdatePackageInput,
): Promise<PackageRow> {
  if (await packageSlugExists(input.slug, id)) throw PACKAGE_SLUG_TAKEN();

  const [row] = await db
    .update(packages)
    .set({
      name: input.name,
      slug: input.slug,
      tagline: input.tagline,
      description: input.description,
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(eq(packages.id, id))
    .returning();

  if (!row) {
    throw new NotFoundError('package.not_found', 'El paquete no existe.');
  }

  return row;
}

export async function setPackageActive(
  id: string,
  active: boolean,
): Promise<PackageRow> {
  const [row] = await db
    .update(packages)
    .set({ active, updatedAt: new Date() })
    .where(eq(packages.id, id))
    .returning();

  if (!row) {
    throw new NotFoundError('package.not_found', 'El paquete no existe.');
  }

  return row;
}

/**
 * Adds a product to a package, or raises its quantity if it is already in it.
 *
 * The table refuses a duplicate `(package_id, product_id)` outright, so the
 * choice is between an error the admin has to understand and the behaviour they
 * meant: adding "2 more" of something already listed is a quantity change, not
 * a second line.
 */
export async function addPackageItem(
  packageId: string,
  input: PackageItemInput,
): Promise<void> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);

  if (!product) {
    throw new NotFoundError('product.not_found', 'El producto no existe.');
  }

  await db
    .insert(packageItems)
    .values({ packageId, productId: input.productId, quantity: input.quantity })
    .onConflictDoUpdate({
      target: [packageItems.packageId, packageItems.productId],
      set: { quantity: input.quantity },
    });
}

export async function removePackageItem(
  packageId: string,
  productId: string,
): Promise<void> {
  await db
    .delete(packageItems)
    .where(
      and(
        eq(packageItems.packageId, packageId),
        eq(packageItems.productId, productId),
      ),
    );
}
