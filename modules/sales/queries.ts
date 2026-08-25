import 'server-only';

/**
 * SAL — read models.
 */
import { desc, eq, ilike, or, sql, and, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import {
  orders,
  orderItems,
  type OrderRow,
  type OrderItemRow,
  type OrderStatus,
  type PaymentStatus,
} from '@/db/schema/sales';

export const ORDERS_PER_PAGE = 10;

export type OrderListItem = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: 'pickup' | 'delivery';
  totalCents: number;
  itemCount: number;
  createdAt: Date;
};

/**
 * Search by order number, customer name or phone (RF-SAL-007).
 *
 * A bare number is matched against `order_number` as well as the phone, because
 * "1043" on the phone is far more likely to be an order number than part of a
 * telephone.
 */
function orderSearch(query: string): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;

  const pattern = `%${trimmed}%`;
  const clauses: SQL[] = [
    ilike(orders.customerName, pattern),
    sql`regexp_replace(${orders.customerPhone}, '\\D', '', 'g') LIKE ${`%${trimmed.replace(/\D/g, '')}%`}`,
  ];

  if (/^\d+$/.test(trimmed)) {
    clauses.push(sql`${orders.orderNumber} = ${Number(trimmed)}`);
  }

  return or(...clauses);
}

export async function listOrders(
  query: string,
  page: number,
  status?: OrderStatus,
): Promise<{ items: OrderListItem[]; total: number; totalPages: number }> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const offset = (safePage - 1) * ORDERS_PER_PAGE;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillmentType: orders.fulfillmentType,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      // Correlated count rather than a join + GROUP BY: the join would multiply
      // the order row per line and force grouping every selected column.
      //
      // Table names are written out instead of interpolating the Drizzle
      // objects: inside a subquery Drizzle renders columns unqualified, so
      // `${orderItems.orderId} = ${orders.id}` came out as
      // `"order_id" = "id"` — both resolving to `order_items`, which is never
      // true and silently returned 0 for every order.
      itemCount: sql<number>`(
        SELECT count(*) FROM "order_items" WHERE "order_items"."order_id" = "orders"."id"
      )`.mapWith(Number),
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(orderSearch(query), status ? eq(orders.status, status) : undefined),
    )
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(ORDERS_PER_PAGE)
    .offset(offset);

  const total = rows[0]?.total ?? 0;

  return {
    items: rows.map(({ total: _total, ...row }) => row),
    total,
    totalPages: Math.ceil(total / ORDERS_PER_PAGE),
  };
}

export type OrderDetail = OrderRow & { items: OrderItemRow[] };

/**
 * Full order with its lines.
 *
 * The lines are the snapshot taken at creation, so this view keeps showing what
 * was actually sold even after the catalogue changes (RN-005).
 */
export async function getOrderById(
  id: string,
): Promise<OrderDetail | undefined> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return undefined;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.productName);

  return { ...order, items };
}

/** Open orders per status, for the list's filter chips and the dashboard. */
export async function countOpenOrders(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(sql`${orders.status} NOT IN ('completed', 'cancelled')`);

  return row?.n ?? 0;
}
