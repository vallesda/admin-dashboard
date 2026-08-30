import 'server-only';

/**
 * PAG — releasing stock that is being held for money that never arrived.
 *
 * See DOCS/PAGOS.md §10. `createOrder` reserves inventory the moment an order
 * exists, which is right for an order a person took responsibility for and
 * wrong for a checkout somebody abandoned. Without this, `reserved` only ever
 * grows: in a week the shop shows "agotado" with a full cold room, and `RN-003`
 * is being enforced against a number that stopped meaning anything.
 *
 * ## Why this exists as well as the webhook
 *
 * `checkout.session.expired` is the primary signal and it is enough almost
 * always. Stripe retries delivery for three days with exponential backoff — but
 * if the endpoint was down longer than that, the event is gone for good. A
 * scheduled sweep is the only mechanism that does not depend on the network
 * having behaved.
 *
 * ## Why only `online` orders are cancelled automatically
 *
 * **Automatic cancellation is only legitimate when the counterparty is a
 * machine.** An expired Stripe session is a verifiable fact. A person who said
 * "paso en la tarde" made a promise to another person, and only a person should
 * break it — a customer who arrives an hour late to find their order undone and
 * their fish sold does not come back. `on_site` orders are surfaced for a human
 * to decide (`staleHolds`), never swept.
 */
import { and, asc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema/sales';
import { payments } from '@/db/schema/payments';
import { changeOrderStatus } from '@/modules/sales/service';
import { voidOpenAttempts } from './checkout';

/** Statuses that still hold a reservation (mirrors `holdsReservation`). */
const OPEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'] as const;

/**
 * How long an online order may hold stock with nothing to show for it.
 *
 * A Checkout Session expires after 24 hours, so anything past that plus a
 * margin is either an abandoned cart or an event we never received. The margin
 * exists so the sweep never races the webhook: if both are about to act, the
 * webhook — which knows *why* — should win.
 */
const ABANDONED_AFTER_HOURS = 26;

export type SweepResult = {
  released: { orderId: string; orderNumber: number; reason: string }[];
  failed: { orderId: string; error: string }[];
};

/**
 * Cancels online orders that are holding stock for a payment that will not come.
 *
 * Two populations, both requiring `payment_mode = 'online'` and no settled
 * payment:
 *
 * 1. an attempt whose `expires_at` has passed — the voucher or session died;
 * 2. an order older than the cut-off with no live attempt at all — the shopper
 *    never opened the payment page, or the attempt row was lost.
 *
 * Each order is cancelled through `changeOrderStatus`, not by hand. That
 * function is transactional and already releases reservations; a bespoke
 * `UPDATE` here would be a second way to cancel an order, and the two would
 * drift.
 */
export async function releaseAbandonedCheckouts(): Promise<SweepResult> {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 3600 * 1000);

  const candidates = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      createdAt: orders.createdAt,
      expiredAt: sql<Date | null>`max(${payments.expiresAt})`,
      liveAttempts: sql<number>`count(*) filter (
        where ${payments.status} in ('created','processing')
          and (${payments.expiresAt} is null or ${payments.expiresAt} > now())
      )::int`,
      settled: sql<number>`count(*) filter (where ${payments.status} = 'succeeded')::int`,
    })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(
      and(
        eq(orders.paymentMode, 'online'),
        inArray(orders.status, [...OPEN_STATUSES]),
        // `partially_refunded`/`refunded` imply money moved at some point, and
        // an order with history is not an abandoned cart.
        inArray(orders.paymentStatus, ['unpaid', 'processing']),
        lt(orders.createdAt, cutoff),
      ),
    )
    .groupBy(orders.id, orders.orderNumber, orders.createdAt)
    .orderBy(asc(orders.createdAt));

  const result: SweepResult = { released: [], failed: [] };

  for (const row of candidates) {
    // Belt and braces: the aggregate already excludes settled orders through
    // `paymentStatus`, but money is not the place to rely on one filter.
    if (row.settled > 0 || row.liveAttempts > 0) continue;

    const reason = row.expiredAt
      ? 'La referencia de pago venció sin cobrarse.'
      : 'El pago en línea nunca se completó.';

    try {
      /*
       * `actorId` is null: nobody at the shop cancelled this. The same
       * convention the storefront uses for orders it creates, and what lets the
       * inventory ledger say honestly that no person released this stock.
       */
      // Closes the Stripe session too, so a customer who opens a day-old link
      // does not get a payment page for stock that is back on sale.
      await voidOpenAttempts(row.id);
      await changeOrderStatus(row.id, 'cancelled', null);
      result.released.push({
        orderId: row.id,
        orderNumber: row.orderNumber,
        reason,
      });
    } catch (error) {
      // One order that cannot be cancelled must not stop the rest. A sweep that
      // aborts halfway leaves the remaining stock held for another day.
      result.failed.push({
        orderId: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export type StaleHold = {
  id: string;
  orderNumber: number;
  customerName: string;
  status: string;
  totalCents: number;
  /**
   * How long this order has been holding stock, in whole hours.
   *
   * Computed in SQL rather than in the component. `Date.now()` during render is
   * impure — React may re-render and get a different answer — and the database
   * already knows what time it is.
   */
  heldForHours: number;
};

/**
 * Counter orders that have been holding stock for a while.
 *
 * Deliberately a list and not a sweep. This is the human half of §10: the panel
 * says which promises are getting old, and a person decides whether to call the
 * customer or let the order go. Taking that decision automatically would be
 * cheaper and would cost the shop the customer.
 */
export async function staleHolds(afterHours = 24): Promise<StaleHold[]> {
  const cutoff = new Date(Date.now() - afterHours * 3600 * 1000);

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      status: orders.status,
      totalCents: orders.totalCents,
      heldForHours: sql<number>`floor(extract(epoch from (now() - ${orders.createdAt})) / 3600)::int`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.status, [...OPEN_STATUSES]),
        eq(orders.paymentStatus, 'unpaid'),
        lt(orders.createdAt, cutoff),
        // Online orders that are this old are the sweep's business, not a
        // person's — unless the sweep could not cancel them, in which case they
        // deserve to be seen here too.
        or(
          eq(orders.paymentMode, 'on_site'),
          isNull(orders.paymentMode),
        ),
      ),
    )
    .orderBy(asc(orders.createdAt))
    .limit(20);
}
