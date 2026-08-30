import 'server-only';

/**
 * TDA — public read models.
 *
 * Reads across Catalog and Inventory to build what the storefront shows. Owns
 * no entities and restates no rules: "sellable" still means `active`, decided
 * by Catalog, and `available` is still `onHand - reserved`, decided by
 * Inventory.
 *
 * Every function returns DTOs, never rows. That is the only reason `costCents`
 * cannot reach the public API by accident.
 */
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import {
  categories,
  products,
  packages,
  packageItems,
} from '@/db/schema/catalog';
import { inventory } from '@/db/schema/inventory';
import { orders, orderItems } from '@/db/schema/sales';
import {
  toPublicProduct,
  toPublicCollection,
  type PublicProduct,
  type PublicCollection,
  type PublicOrder,
  type PublicShelfItem,
  type PublicPackage,
} from './dto';

export const STOREFRONT_PAGE_SIZE = 24;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Columns the public catalogue needs. Note what is absent: `costCents`. */
const productColumns = {
  id: products.id,
  categoryId: products.categoryId,
  sku: products.sku,
  name: products.name,
  slug: products.slug,
  description: products.description,
  priceCents: products.priceCents,
  costCents: sql<number | null>`NULL`.mapWith((v) => v as null),
  imageUrl: products.imageUrl,
  unitType: products.unitType,
  netWeightGrams: products.netWeightGrams,
  status: products.status,
  shortDescription: products.shortDescription,
  origin: products.origin,
  presentation: products.presentation,
  storageInstructions: products.storageInstructions,
  preparationSuggestions: products.preparationSuggestions,
  isFeatured: products.isFeatured,
  isSeasonal: products.isSeasonal,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
  categoryName: categories.name,
  categorySlug: categories.slug,
  available: sql<number>`coalesce(${inventory.onHand}, 0) - coalesce(${inventory.reserved}, 0)`.mapWith(
    Number,
  ),
};

/**
 * Base query for every public product read.
 *
 * `status = 'active'` is not optional and not a parameter: a draft or archived
 * product must never appear on the storefront (RF-TDA-001, RF-CAT-007), and
 * making it configurable would be one refactor away from leaking one.
 */
function publicProducts() {
  return db
    .select(productColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .$dynamic();
}

function search(query: string): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;

  const pattern = `%${trimmed}%`;
  return or(
    ilike(products.name, pattern),
    ilike(products.shortDescription, pattern),
    ilike(products.origin, pattern),
  );
}

export async function listProducts(options: {
  collection?: string;
  query?: string;
  page?: number;
} = {}): Promise<{ items: PublicProduct[]; total: number; totalPages: number }> {
  const page = Math.max(1, Math.floor(options.page ?? 1) || 1);

  const rows = await publicProducts()
    .where(
      and(
        eq(products.status, 'active'),
        options.collection ? eq(categories.slug, options.collection) : undefined,
        search(options.query ?? ''),
      ),
    )
    .orderBy(desc(products.isFeatured), asc(products.name))
    .limit(STOREFRONT_PAGE_SIZE)
    .offset((page - 1) * STOREFRONT_PAGE_SIZE);

  const [count] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.status, 'active'),
        options.collection ? eq(categories.slug, options.collection) : undefined,
        search(options.query ?? ''),
      ),
    );

  const total = count?.n ?? 0;

  return {
    items: rows.map(toPublicProduct),
    total,
    totalPages: Math.ceil(total / STOREFRONT_PAGE_SIZE),
  };
}

/** By `handle` (our `slug`) — the storefront never sees a uuid in a URL. */
export async function getProductByHandle(
  handle: string,
): Promise<PublicProduct | undefined> {
  const [row] = await publicProducts()
    .where(and(eq(products.slug, handle), eq(products.status, 'active')))
    .limit(1);

  return row ? toPublicProduct(row) : undefined;
}

export async function getFeaturedProducts(limit = 3): Promise<PublicProduct[]> {
  const rows = await publicProducts()
    .where(and(eq(products.status, 'active'), eq(products.isFeatured, true)))
    .orderBy(asc(products.name))
    .limit(limit);

  return rows.map(toPublicProduct);
}

/**
 * Same-category products, excluding the one being viewed.
 *
 * Deliberately not "random products": the storefront spec is explicit that
 * cross-sells must be relevant, and same-category is the only relevance signal
 * the data actually supports today.
 */
export async function getRelatedProducts(
  productId: string,
  limit = 4,
): Promise<PublicProduct[]> {
  const [current] = await db
    .select({ categoryId: products.categoryId })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!current?.categoryId) return [];

  const rows = await publicProducts()
    .where(
      and(
        eq(products.status, 'active'),
        eq(products.categoryId, current.categoryId),
        sql`${products.id} <> ${productId}`,
      ),
    )
    .orderBy(desc(products.isFeatured), asc(products.name))
    .limit(limit);

  return rows.map(toPublicProduct);
}

/** Active categories that actually have something to sell. */
export async function listCollections(): Promise<PublicCollection[]> {
  const rows = await db
    .selectDistinct({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      sortOrder: categories.sortOrder,
      active: categories.active,
      // Selected because `toPublicCollection` takes a whole row. `selectDistinct`
      // needs every column named explicitly, so a new column on the table is a
      // compile error here rather than a silent omission.
      imageUrl: categories.imageUrl,
      tagline: categories.tagline,
      isFeatured: categories.isFeatured,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .innerJoin(products, eq(products.categoryId, categories.id))
    .where(and(eq(categories.active, true), eq(products.status, 'active')))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows.map(toPublicCollection);
}

/** Order confirmation, addressed by opaque token (never by order number). */
export async function getOrderByToken(
  token: string,
): Promise<PublicOrder | undefined> {
  // A non-uuid reaches Postgres as `invalid input syntax for type uuid`, which
  // surfaces as a 500. Anyone probing `/orders/27` would get a server error
  // instead of "not found" — noisier in the logs and more informative to them
  // than it should be.
  if (!UUID_PATTERN.test(token)) return undefined;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.publicToken, token))
    .limit(1);

  if (!order) return undefined;

  const lines = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.productName));

  const mxn = (amountCents: number) => ({ amountCents, currency: 'MXN' as const });

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentType: order.fulfillmentType,
    // The snapshot taken when the order was placed, not the customer's current
    // record — and deliberately no phone or email in a token-addressed response.
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    lines: lines.map((l) => ({
      name: l.productName,
      quantity: l.quantity,
      unitPrice: mxn(l.unitPriceCents),
      lineTotal: mxn(l.lineTotalCents),
    })),
    subtotal: mxn(order.subtotalCents),
    deliveryFee: mxn(order.deliveryFeeCents),
    total: mxn(order.totalCents),
    createdAt: order.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Home shelf and packages
// ---------------------------------------------------------------------------

/**
 * What the storefront's "Para qué lo quieres" shelf shows.
 *
 * Two sources, one list. A featured category filters the catalogue; a package is
 * a fixed curated bundle. The shopper is asking the same question of both — what
 * am I making tonight — so they share a shelf, and `kind` is what tells the
 * storefront which link to build.
 *
 * Both are filtered the same way the collections nav already is: nothing appears
 * unless it has something to sell. A category needs an active product; a package
 * needs at least one line whose product is active. An empty tile is a promise
 * the catalogue cannot keep, and this shop's whole design is built on not making
 * those.
 *
 * A category with no image of its own borrows the photograph of a product
 * actually in it. That keeps the shelf populated from day one without anybody
 * uploading anything, and — more to the point — every picture on it is a real
 * photograph of something really in that category, which is the rule the rest of
 * the storefront runs on.
 */
export async function listHomeShelf(): Promise<PublicShelfItem[]> {
  const categoryImage = sql<string | null>`(
    select p.image_url from products p
    where p.category_id = ${categories.id}
      and p.status = 'active'
      and p.image_url is not null
    order by p.is_featured desc, p.name asc
    limit 1
  )`;

  const categoryRows = await db
    .select({
      handle: categories.slug,
      title: categories.name,
      tagline: categories.tagline,
      imageUrl: sql<string | null>`coalesce(${categories.imageUrl}, ${categoryImage})`,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .where(
      and(
        eq(categories.active, true),
        eq(categories.isFeatured, true),
        sql`exists (select 1 from products p where p.category_id = ${categories.id} and p.status = 'active')`,
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  /*
   * The line count comes from its own grouped query rather than a correlated
   * subquery in the select list. Drizzle does not qualify a column reference
   * used inside `sql` in that position — `${packages.id}` renders as a bare
   * `"id"`, which Postgres rejects — while the same reference inside `where`
   * qualifies correctly. Two small queries over a handful of rows are cheaper
   * than a trap that only shows up at runtime.
   */
  const counts = await db
    .select({
      packageId: packageItems.packageId,
      itemCount: sql<number>`count(*)`.mapWith(Number),
    })
    .from(packageItems)
    .innerJoin(products, eq(products.id, packageItems.productId))
    .where(eq(products.status, 'active'))
    .groupBy(packageItems.packageId);

  const countOf = new Map(counts.map((c) => [c.packageId, c.itemCount]));

  const packageRows = await db
    .select({
      id: packages.id,
      handle: packages.slug,
      title: packages.name,
      tagline: packages.tagline,
      imageUrl: packages.imageUrl,
      sortOrder: packages.sortOrder,
    })
    .from(packages)
    .where(
      and(
        eq(packages.active, true),
        sql`exists (
          select 1 from package_items i
          join products p on p.id = i.product_id
          where i.package_id = ${packages.id} and p.status = 'active'
        )`,
      ),
    )
    .orderBy(asc(packages.sortOrder), asc(packages.name));

  // `sortOrder` rides along only to merge the two sources, then is stripped:
  // it is an admin concern and has no business in the public contract.
  const items: (PublicShelfItem & { sortOrder: number })[] = [
    ...categoryRows.map((row) => ({
      kind: 'category' as const,
      handle: row.handle,
      title: row.title,
      tagline: row.tagline,
      image: row.imageUrl ? { url: row.imageUrl, altText: row.title } : null,
      itemCount: null,
      sortOrder: row.sortOrder,
    })),
    ...packageRows.map((row) => ({
      kind: 'package' as const,
      handle: row.handle,
      title: row.title,
      tagline: row.tagline,
      image: row.imageUrl ? { url: row.imageUrl, altText: row.title } : null,
      itemCount: countOf.get(row.id) ?? 0,
      sortOrder: row.sortOrder,
    })),
  ];

  // Packages sort after categories at equal weight: the shop's own curation is
  // the more specific answer, so it should not be buried, but a category is the
  // safer default when both carry sort order 0.
  return items
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder
        ? a.sortOrder - b.sortOrder
        : a.title.localeCompare(b.title, 'es'),
    )
    .map(({ sortOrder: _sortOrder, ...item }) => item);
}

/**
 * One package, with every line it holds.
 *
 * Returns `undefined` for an unknown or inactive slug so the route can answer a
 * real 404 rather than an empty page — the same treatment `getProductByHandle`
 * gives a missing product.
 *
 * Lines whose product is no longer active are dropped rather than shown as
 * unavailable: a piece the shop archived is not part of the recipe any more, and
 * listing it would invite the shopper to go looking for it.
 */
export async function getPackageByHandle(
  handle: string,
): Promise<PublicPackage | undefined> {
  const [row] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.slug, handle), eq(packages.active, true)))
    .limit(1);

  if (!row) return undefined;

  const lineRows = await publicProducts()
    .innerJoin(packageItems, eq(packageItems.productId, products.id))
    .where(and(eq(packageItems.packageId, row.id), eq(products.status, 'active')))
    .orderBy(asc(packageItems.sortOrder), asc(products.name));

  const quantities = await db
    .select({ productId: packageItems.productId, quantity: packageItems.quantity })
    .from(packageItems)
    .where(eq(packageItems.packageId, row.id));

  const quantityOf = new Map(quantities.map((q) => [q.productId, q.quantity]));

  const lines = lineRows.map((line) => ({
    product: toPublicProduct(line),
    quantity: quantityOf.get(line.id) ?? 1,
  }));

  const amountCents = lines.reduce(
    (sum, line) => sum + line.product.price.amountCents * line.quantity,
    0,
  );

  return {
    handle: row.slug,
    title: row.name,
    tagline: row.tagline,
    description: row.description,
    image: row.imageUrl ? { url: row.imageUrl, altText: row.name } : null,
    lines,
    total: { amountCents, currency: 'MXN' },
    // Every line has to be fillable. A bundle sold as "everything for this dish"
    // that arrives short a piece is worse than one that says so up front.
    availableForSale:
      lines.length > 0 &&
      lines.every((line) => line.product.available >= line.quantity),
  };
}
