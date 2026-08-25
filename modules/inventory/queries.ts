import 'server-only';

/**
 * INV — read models.
 *
 * `available` is computed here and never stored (INV-STK-05).
 */
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { products } from '@/db/schema/catalog';
import { adminUsers } from '@/db/schema/identity';
import {
  inventory,
  inventoryMovements,
  type MovementType,
} from '@/db/schema/inventory';

export const INVENTORY_PER_PAGE = 10;
export const MOVEMENTS_PER_PAGE = 20;

export type InventoryListItem = {
  productId: string;
  sku: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  /**
   * False when the product has no `inventory` row yet. Such a product cannot be
   * received or sold, so it has to be visible and fixable rather than absent.
   */
  hasInventory: boolean;
};

function inventorySearch(query: string): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;

  const pattern = `%${trimmed}%`;
  return or(ilike(products.name, pattern), ilike(products.sku, pattern));
}

/**
 * One page of stock levels.
 *
 * `lowOnly` filters to products at or below their threshold (RF-INV-008).
 * The comparison lives in SQL so the filter and the pagination agree: filtering
 * in JS after the LIMIT would silently return short pages.
 */
export async function listInventory(
  query: string,
  page: number,
  lowOnly = false,
): Promise<{
  items: InventoryListItem[];
  total: number;
  totalPages: number;
}> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const offset = (safePage - 1) * INVENTORY_PER_PAGE;

  // COALESCE so a product with no inventory row still computes to 0 instead of
  // dropping out of the comparison as NULL.
  const onHandExpr = sql<number>`coalesce(${inventory.onHand}, 0)`;
  const reservedExpr = sql<number>`coalesce(${inventory.reserved}, 0)`;
  const thresholdExpr = sql<number>`coalesce(${inventory.lowStockThreshold}, 0)`;
  const lowStockExpr = sql<boolean>`(${onHandExpr} - ${reservedExpr}) <= ${thresholdExpr}`;

  const where = and(
    inventorySearch(query),
    lowOnly ? lowStockExpr : undefined,
    // Archived products are not part of day-to-day stock work.
    sql`${products.status} <> 'archived'`,
  );

  // Driven from `products`, not from `inventory`: an INNER JOIN the other way
  // made a product without an inventory row silently invisible here — you could
  // neither see it nor fix it. Every sellable product must appear.
  const rows = await db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      status: products.status,
      onHand: onHandExpr.mapWith(Number),
      reserved: reservedExpr.mapWith(Number),
      lowStockThreshold: thresholdExpr.mapWith(Number),
      isLowStock: lowStockExpr,
      hasInventory: sql<boolean>`${inventory.productId} IS NOT NULL`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(where)
    // Products missing inventory first — they are broken and need action —
    // then lowest availability.
    .orderBy(
      sql`(${inventory.productId} IS NOT NULL) ASC`,
      sql`(${onHandExpr} - ${reservedExpr}) ASC`,
      products.name,
    )
    .limit(INVENTORY_PER_PAGE)
    .offset(offset);

  const total = rows[0]?.total ?? 0;

  return {
    items: rows.map(({ total: _total, ...row }) => ({
      ...row,
      available: row.onHand - row.reserved,
    })),
    total,
    totalPages: Math.ceil(total / INVENTORY_PER_PAGE),
  };
}

export type MovementListItem = {
  id: number;
  type: MovementType;
  onHandDelta: number;
  reservedDelta: number;
  note: string | null;
  orderId: string | null;
  createdAt: Date;
  actorName: string | null;
};

/**
 * Movement history for one product — the answer to "why is stock at 17?".
 */
export async function listMovements(
  productId: string,
  limit = MOVEMENTS_PER_PAGE,
): Promise<MovementListItem[]> {
  return db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      onHandDelta: inventoryMovements.onHandDelta,
      reservedDelta: inventoryMovements.reservedDelta,
      note: inventoryMovements.note,
      orderId: inventoryMovements.orderId,
      createdAt: inventoryMovements.createdAt,
      // LEFT: the actor may have been deleted (FK is ON DELETE SET NULL), and
      // losing an employee must not hide the movement they made.
      actorName: adminUsers.name,
    })
    .from(inventoryMovements)
    .leftJoin(adminUsers, eq(adminUsers.id, inventoryMovements.createdBy))
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
    .limit(limit);
}

export async function getInventoryWithProduct(productId: string) {
  // LEFT JOIN for the same reason as the list: the detail page must open for a
  // product whose inventory row is missing, so it can offer to create it.
  const [row] = await db
    .select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      onHand: sql<number>`coalesce(${inventory.onHand}, 0)`.mapWith(Number),
      reserved: sql<number>`coalesce(${inventory.reserved}, 0)`.mapWith(Number),
      lowStockThreshold: sql<number>`coalesce(${inventory.lowStockThreshold}, 0)`.mapWith(Number),
      hasInventory: sql<boolean>`${inventory.productId} IS NOT NULL`,
    })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(eq(products.id, productId))
    .limit(1);

  if (!row) return undefined;

  return { ...row, available: row.onHand - row.reserved };
}

/** Products that have no inventory row — the repair queue. */
export async function countProductsWithoutInventory(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(
      and(
        sql`${products.status} <> 'archived'`,
        sql`${inventory.productId} IS NULL`,
      ),
    );

  return row?.n ?? 0;
}

/** Count of products at or below threshold — for the dashboard card (F4.03). */
export async function countLowStock(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(
      and(
        eq(products.status, 'active'),
        sql`(${inventory.onHand} - ${inventory.reserved}) <= ${inventory.lowStockThreshold}`,
      ),
    );

  return row?.n ?? 0;
}
