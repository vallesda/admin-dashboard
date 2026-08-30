import 'server-only';

/**
 * PAG — read models for the money ledger.
 *
 * Everything here answers one of two questions: *what happened to this order's
 * money*, and *what does the projection say it adds up to*. Nothing here
 * writes; the arithmetic that decides `orders.paymentStatus` lives in
 * `service.ts`, inside the transaction that changes it.
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  payments,
  refunds,
  type PaymentRow,
  type RefundRow,
} from '@/db/schema/payments';
import { adminUsers } from '@/db/schema/identity';

export type PaymentWithActor = PaymentRow & { actorName: string | null };
export type RefundWithActor = RefundRow & { actorName: string | null };

/**
 * The money side of one order, oldest first.
 *
 * Chronological rather than newest-first because this reads as a story: the
 * voucher was issued, then it was paid, then half of it came back. Reversing
 * that makes an operator reconstruct the sequence in their head.
 */
export async function listPaymentsForOrder(
  orderId: string,
): Promise<PaymentWithActor[]> {
  return db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      provider: payments.provider,
      status: payments.status,
      amountCents: payments.amountCents,
      currency: payments.currency,
      stripeSessionId: payments.stripeSessionId,
      stripePaymentIntentId: payments.stripePaymentIntentId,
      stripeChargeId: payments.stripeChargeId,
      paymentMethodType: payments.paymentMethodType,
      hostedVoucherUrl: payments.hostedVoucherUrl,
      expiresAt: payments.expiresAt,
      actorId: payments.actorId,
      note: payments.note,
      failureReason: payments.failureReason,
      createdAt: payments.createdAt,
      paidAt: payments.paidAt,
      actorName: adminUsers.name,
    })
    .from(payments)
    .leftJoin(adminUsers, eq(adminUsers.id, payments.actorId))
    .where(eq(payments.orderId, orderId))
    .orderBy(payments.createdAt);
}

export async function listRefundsForOrder(
  orderId: string,
): Promise<RefundWithActor[]> {
  return db
    .select({
      id: refunds.id,
      paymentId: refunds.paymentId,
      orderId: refunds.orderId,
      amountCents: refunds.amountCents,
      reason: refunds.reason,
      note: refunds.note,
      status: refunds.status,
      stripeRefundId: refunds.stripeRefundId,
      failureReason: refunds.failureReason,
      actorId: refunds.actorId,
      createdAt: refunds.createdAt,
      actorName: adminUsers.name,
    })
    .from(refunds)
    .leftJoin(adminUsers, eq(adminUsers.id, refunds.actorId))
    .where(eq(refunds.orderId, orderId))
    .orderBy(refunds.createdAt);
}

/** The settled payment an order's refunds go back through, if there is one. */
export async function findSettledPayment(
  orderId: string,
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'succeeded')))
    .orderBy(desc(payments.paidAt))
    .limit(1);

  return row;
}

/** An in-flight attempt: an open checkout session or an issued voucher. */
export async function findOpenAttempt(
  orderId: string,
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.orderId, orderId),
        inArray(payments.status, ['created', 'processing']),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  return row;
}

export type MoneySummary = {
  /** Collected and settled. */
  paidCents: number;
  /** Given back, counting only refunds that actually went through. */
  refundedCents: number;
  /** What the shop is left holding. */
  netCents: number;
  /** A refund that failed and needs a human. */
  hasFailedRefund: boolean;
};

/**
 * What this order's ledger adds up to.
 *
 * `pending` refunds count against the balance. A refund Stripe has accepted but
 * not yet settled is money the shop no longer has any claim to, and treating it
 * as still collected would let a second refund be issued for the same pesos.
 */
export async function moneySummary(orderId: string): Promise<MoneySummary> {
  const [paid] = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'succeeded')));

  const [given] = await db
    .select({ total: sql<number>`coalesce(sum(${refunds.amountCents}), 0)::int` })
    .from(refunds)
    .where(
      and(
        eq(refunds.orderId, orderId),
        inArray(refunds.status, ['succeeded', 'pending', 'requires_action']),
      ),
    );

  const [failed] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(refunds)
    .where(and(eq(refunds.orderId, orderId), eq(refunds.status, 'failed')));

  const paidCents = paid?.total ?? 0;
  const refundedCents = given?.total ?? 0;

  return {
    paidCents,
    refundedCents,
    netCents: paidCents - refundedCents,
    hasFailedRefund: (failed?.total ?? 0) > 0,
  };
}
