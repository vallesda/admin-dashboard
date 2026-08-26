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
import { categories, products } from '@/db/schema/catalog';
import { inventory } from '@/db/schema/inventory';
import { orders, orderItems } from '@/db/schema/sales';
import {
  toPublicProduct,
  toPublicCollection,
  type PublicProduct,
  type PublicCollection,
  type PublicOrder,
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
