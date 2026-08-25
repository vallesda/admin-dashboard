import 'server-only';

/**
 * ADM — Admin read models.
 *
 * Realiza: RF-ADM-001, RF-ADM-002, RF-ADM-003 · HU-ADM-001.
 *
 * This context owns no entities. It reads across Sales, Inventory and Catalog
 * to build the operator's daily view — which regla de gobierno 4 allows for
 * read models, and only for read models. Nothing here mutates, and no business
 * rule is restated: "sold" means an Order reached `completed`, decided by Sales.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { products } from '@/db/schema/catalog';
import { inventory } from '@/db/schema/inventory';
import { orders } from '@/db/schema/sales';
import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';

/**
 * "Today" is the shop's day, not UTC's.
 *
 * A sale completed at 8pm in Mexico City is already tomorrow in UTC, so
 * truncating `now()` directly would move the evening's takings into the next
 * day's figure. Converting to local wall time, truncating there and converting
 * back gives the boundary the shop actually experiences.
 */
const TODAY_START = sql`(date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')`;

export type DashboardMetrics = {
  openOrders: number;
  salesTodayCents: number;
  ordersTodayCount: number;
  lowStockCount: number;
  unpaidOrders: number;
};

/**
 * The four headline figures, in one round trip.
 *
 * Written as a single SELECT of scalar subqueries rather than four queries:
 * they are all small, and one trip keeps the card row consistent with itself —
 * four separate reads could straddle a mutation and show totals that never
 * existed together.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [row] = await db
    .select({
      openOrders: sql<number>`(
        SELECT count(*) FROM "orders"
        WHERE "orders"."status" NOT IN ('completed', 'cancelled')
      )`.mapWith(Number),

      // Only `completed` counts as a sale (HU-ADM-001). An order that was
      // merely paid has not been handed over, and a cancelled one never will.
      salesTodayCents: sql<number>`(
        SELECT coalesce(sum("orders"."total_cents"), 0) FROM "orders"
        WHERE "orders"."status" = 'completed'
          AND "orders"."completed_at" >= ${TODAY_START}
      )`.mapWith(Number),

      ordersTodayCount: sql<number>`(
        SELECT count(*) FROM "orders"
        WHERE "orders"."created_at" >= ${TODAY_START}
      )`.mapWith(Number),

      lowStockCount: sql<number>`(
        SELECT count(*) FROM "inventory"
        JOIN "products" ON "products"."id" = "inventory"."product_id"
        WHERE "products"."status" = 'active'
          AND ("inventory"."on_hand" - "inventory"."reserved") <= "inventory"."low_stock_threshold"
      )`.mapWith(Number),

      unpaidOrders: sql<number>`(
        SELECT count(*) FROM "orders"
        WHERE "orders"."payment_status" = 'unpaid'
          AND "orders"."status" NOT IN ('cancelled')
      )`.mapWith(Number),
    })
    .from(sql`(SELECT 1) AS "one"`);

  return row;
}

export type RecentOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: Date;
};

/** Latest orders, whatever their state — this is the "what just happened" list. */
export async function listRecentOrders(limit = 5): Promise<RecentOrder[]> {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit);
}

export type LowStockItem = {
  productId: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
};

/**
 * Products at or below their threshold, scarcest first (RF-INV-008).
 *
 * `active` only: a draft or archived product cannot be sold, so its stock is
 * not something anyone needs to act on today.
 */
export async function listLowStock(limit = 5): Promise<LowStockItem[]> {
  return db
    .select({
      productId: inventory.productId,
      sku: products.sku,
      name: products.name,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      available: sql<number>`${inventory.onHand} - ${inventory.reserved}`.mapWith(
        Number,
      ),
      lowStockThreshold: inventory.lowStockThreshold,
    })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(
      and(
        eq(products.status, 'active'),
        sql`(${inventory.onHand} - ${inventory.reserved}) <= ${inventory.lowStockThreshold}`,
      ),
    )
    .orderBy(sql`(${inventory.onHand} - ${inventory.reserved}) ASC`, products.name)
    .limit(limit);
}
