/**
 * PAG — the arithmetic behind `orders.paymentStatus`. Pure: no database.
 *
 * Split out of `service.ts` for the same reason `state-machine.ts` is split out
 * of `sales/service.ts`: this is the rule that decides whether a shop believes
 * it has been paid, and a rule that can only be exercised by writing rows to
 * Postgres is a rule nobody exercises.
 *
 * See DOCS/PAGOS.md §6.
 */
import type { PaymentStatus } from '@/db/schema/sales';

export type LedgerTotals = {
  /** Sum of payments that actually settled. */
  paidCents: number;
  /**
   * Sum of refunds that count against the balance.
   *
   * Pending refunds are included. A refund Stripe has accepted but not yet
   * settled is money the shop has no further claim to; treating it as still
   * collected would let a second refund go out for the same pesos.
   */
  refundedCents: number;
  /**
   * Whether an attempt exists that the customer has committed to — an issued
   * OXXO voucher, a transfer on its way.
   *
   * A merely *created* Checkout Session does not count. That is a URL nobody
   * may ever open, and calling it "cobrando" would freeze the order for a
   * shopper who never came back.
   */
  hasCommittedAttempt: boolean;
};

/**
 * What the ledger adds up to, as one word.
 *
 * The order of the branches is the order the money moves, and it is the whole
 * of the rule:
 *
 * 1. nothing settled, nothing committed → `unpaid`;
 * 2. nothing settled but something committed → `processing`;
 * 3. settled, nothing returned → `paid`;
 * 4. settled, part returned → `partially_refunded`;
 * 5. everything returned → `refunded`.
 *
 * `>=` and not `===` in the last case on purpose: refunds are capped at the
 * collected amount before they are written, but if a rounding or a
 * Dashboard-issued refund ever pushed the total over, "reembolsado" is the
 * honest answer and "reembolso parcial" would be a lie.
 */
export function projectPaymentStatus(totals: LedgerTotals): PaymentStatus {
  const { paidCents, refundedCents, hasCommittedAttempt } = totals;

  if (paidCents <= 0) {
    return hasCommittedAttempt ? 'processing' : 'unpaid';
  }

  if (refundedCents <= 0) return 'paid';
  if (refundedCents >= paidCents) return 'refunded';

  return 'partially_refunded';
}
