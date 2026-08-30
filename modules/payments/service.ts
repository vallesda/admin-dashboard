import 'server-only';

/**
 * PAG — the money ledger.
 *
 * See DOCS/PAGOS.md §6. The one idea this module exists to enforce:
 *
 *   Collecting is always the same act — recording a `Payment`. The only thing
 *   that differs between a card charge and a 500-peso note is *who* confirms
 *   the money exists: Stripe over a webhook, or a person with the `admin` role.
 *
 * So there is one `recordPayment`, one `refund`, and one projection. The Stripe
 * webhook writes through the same functions the counter does; it only passes a
 * different provider and a null actor.
 *
 * `orders.paymentStatus` is never assigned from outside this module.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orders, type PaymentStatus } from '@/db/schema/sales';
import {
  payments,
  refunds,
  type PaymentAttemptStatus,
  type PaymentProvider,
  type PaymentRow,
  type RefundReason,
  type RefundRow,
} from '@/db/schema/payments';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { formatCentavos } from '@/lib/money';
import { canTransitionPayment, PAYMENT_STATUS_LABEL } from '@/modules/sales/state-machine';
import { projectPaymentStatus } from './projection';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

// ---------------------------------------------------------------------------
// The projection
// ---------------------------------------------------------------------------

/**
 * Recomputes `orders.paymentStatus` from the ledger.
 *
 * This is the whole of DOCS/PAGOS.md §6 in one function. It is the *only*
 * writer of that column, and it always runs inside the transaction that wrote
 * the payment or refund that changed the answer — exactly the relationship
 * `inventory` has with `inventory_movements`.
 *
 * The order of the checks matters and reads as the money does:
 *
 * 1. nothing settled and nothing in flight → `unpaid`;
 * 2. nothing settled but an attempt is open → `processing` (a voucher is a
 *    promise, not pesos);
 * 3. settled, nothing returned → `paid`;
 * 4. settled, part returned → `partially_refunded`;
 * 5. everything returned → `refunded`.
 *
 * Pending refunds count as returned. A refund Stripe accepted but has not yet
 * settled is money the shop no longer has a claim to, and calling it "still
 * collected" would let a second refund go out for the same pesos.
 */
export async function recomputePaymentStatus(
  tx: Db,
  orderId: string,
): Promise<PaymentStatus> {
  const [settled] = await tx
    .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'succeeded')));

  const [open] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.orderId, orderId),
        inArray(payments.status, ['created', 'processing']),
      ),
    );

  const [returned] = await tx
    .select({ total: sql<number>`coalesce(sum(${refunds.amountCents}), 0)::int` })
    .from(refunds)
    .where(
      and(
        eq(refunds.orderId, orderId),
        inArray(refunds.status, ['succeeded', 'pending', 'requires_action']),
      ),
    );

  const hasOpenAttempt = (open?.total ?? 0) > 0;

  // The decision itself lives in `projection.ts`, with no database in sight, so
  // the rule that says whether this shop has been paid can be exercised in a
  // test rather than only in production.
  const next = projectPaymentStatus({
    paidCents: settled?.total ?? 0,
    refundedCents: returned?.total ?? 0,
    hasCommittedAttempt:
      hasOpenAttempt && (await hasCommittedAttempt(tx, orderId)),
  });

  await tx
    .update(orders)
    .set({ paymentStatus: next, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return next;
}

/**
 * Whether an open attempt has passed the point of the customer choosing.
 *
 * A `created` Checkout Session is a URL nobody may ever open; calling that
 * "cobrando" would freeze the order for a customer who never showed up.
 * `processing` means a voucher exists or a transfer is in flight, which is a
 * real reason for the counter to wait.
 */
async function hasCommittedAttempt(tx: Db, orderId: string): Promise<boolean> {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(eq(payments.orderId, orderId), eq(payments.status, 'processing')),
    );

  return (row?.total ?? 0) > 0;
}

/**
 * Guards the recomputation against an impossible jump.
 *
 * The projection cannot normally produce an illegal transition, but a bug that
 * made it do so would silently corrupt an order's money state. This turns that
 * into a loud failure at the point it happens.
 */
async function assertLegalProjection(
  tx: Db,
  orderId: string,
  next: PaymentStatus,
): Promise<void> {
  const [order] = await tx
    .select({ current: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) throw new NotFoundError('el pedido', orderId);
  if (order.current === next) return;

  if (!canTransitionPayment(order.current, next)) {
    throw new ConflictError(
      'payment.illegal_projection',
      `El estado de pago no puede pasar de ${PAYMENT_STATUS_LABEL[
        order.current
      ].toLowerCase()} a ${PAYMENT_STATUS_LABEL[next].toLowerCase()}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Collecting
// ---------------------------------------------------------------------------

export type RecordPaymentArgs = {
  orderId: string;
  provider: PaymentProvider;
  amountCents: number;
  /** NULL means a provider confirmed it, not a person. */
  actorId: string | null;
  note?: string | null;
  status?: PaymentAttemptStatus;
  stripe?: {
    sessionId?: string | null;
    paymentIntentId?: string | null;
    chargeId?: string | null;
    paymentMethodType?: string | null;
    hostedVoucherUrl?: string | null;
    expiresAt?: Date | null;
  };
};

/**
 * Records money received, whoever received it.
 *
 * Runs in a transaction with the projection, so an order is never briefly
 * "paid" with an empty ledger or the other way round. `tx` is accepted so the
 * webhook and "cobrar y entregar" can fold this into a larger transaction that
 * also moves the operational machine.
 */
export async function recordPayment(
  args: RecordPaymentArgs,
  tx?: Tx,
): Promise<PaymentRow> {
  const run = async (t: Tx): Promise<PaymentRow> => {
    // Lock the order: two people collecting the same order at the same moment
    // must not both write a settled payment.
    const [order] = await t
      .select({ id: orders.id, totalCents: orders.totalCents })
      .from(orders)
      .where(eq(orders.id, args.orderId))
      .for('update')
      .limit(1);

    if (!order) throw new NotFoundError('el pedido', args.orderId);

    const status = args.status ?? 'succeeded';

    if (status === 'succeeded') {
      const [already] = await t
        .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
        .from(payments)
        .where(
          and(
            eq(payments.orderId, args.orderId),
            eq(payments.status, 'succeeded'),
          ),
        );

      const collected = (already?.total ?? 0) + args.amountCents;

      // Collecting more than the order is worth is always a mistake — a typo in
      // the amount, or the same payment recorded twice. Refusing it here is
      // cheaper than reconciling it later.
      if (collected > order.totalCents) {
        throw new ConflictError(
          'payment.over_collection',
          `El pedido vale ${formatCentavos(order.totalCents)} y ya lleva ${formatCentavos(
            already?.total ?? 0,
          )} cobrados. No se pueden registrar ${formatCentavos(args.amountCents)} más.`,
        );
      }
    }

    const [row] = await t
      .insert(payments)
      .values({
        orderId: args.orderId,
        provider: args.provider,
        status,
        amountCents: args.amountCents,
        actorId: args.actorId,
        note: args.note ?? null,
        // The CHECK constraint requires status and timestamp to agree.
        paidAt: status === 'succeeded' ? new Date() : null,
        stripeSessionId: args.stripe?.sessionId ?? null,
        stripePaymentIntentId: args.stripe?.paymentIntentId ?? null,
        stripeChargeId: args.stripe?.chargeId ?? null,
        paymentMethodType: args.stripe?.paymentMethodType ?? null,
        hostedVoucherUrl: args.stripe?.hostedVoucherUrl ?? null,
        expiresAt: args.stripe?.expiresAt ?? null,
      })
      .returning();

    const next = await recomputePaymentStatus(t, args.orderId);
    await assertLegalProjection(t, args.orderId, next);

    return row;
  };

  return tx ? run(tx) : db.transaction(run);
}

/**
 * Moves an existing attempt along — the webhook's main verb.
 *
 * Idempotent by construction: settling a payment that is already `succeeded`
 * rewrites the same row and recomputes the same projection. Stripe delivers the
 * same event more than once by design, and this is where that stops mattering.
 */
export async function updateAttempt(
  paymentId: string,
  patch: {
    status?: PaymentAttemptStatus;
    stripeChargeId?: string | null;
    paymentMethodType?: string | null;
    hostedVoucherUrl?: string | null;
    expiresAt?: Date | null;
    failureReason?: string | null;
  },
  tx?: Tx,
): Promise<PaymentRow> {
  const run = async (t: Tx): Promise<PaymentRow> => {
    const [existing] = await t
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for('update')
      .limit(1);

    if (!existing) throw new NotFoundError('el pago', paymentId);

    const status = patch.status ?? existing.status;

    const [row] = await t
      .update(payments)
      .set({
        ...patch,
        status,
        paidAt:
          status === 'succeeded' ? (existing.paidAt ?? new Date()) : null,
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await recomputePaymentStatus(t, existing.orderId);

    return row;
  };

  return tx ? run(tx) : db.transaction(run);
}

// ---------------------------------------------------------------------------
// Giving it back
// ---------------------------------------------------------------------------

export type RefundArgs = {
  orderId: string;
  /** `'full'` means whatever is left, so no rounding can leave a peso behind. */
  amountCents: number | 'full';
  reason: RefundReason;
  note?: string | null;
  actorId: string | null;
  /** Set by the webhook when Stripe originated or confirmed the refund. */
  stripeRefundId?: string | null;
};

/**
 * Returns money.
 *
 * The single branch in this module: a Stripe payment is refunded through
 * Stripe's API, a manual one is refunded by a person handing over notes. Both
 * produce the same row in the same book — only `stripeRefundId` differs.
 *
 * `refundThroughProvider` is injected rather than imported so this module does
 * not depend on the Stripe client. That keeps the ledger testable without a
 * network, and it is what would let a second provider exist later without
 * touching this function.
 */
export async function refundOrder(
  args: RefundArgs,
  refundThroughProvider?: (payment: PaymentRow, amountCents: number) => Promise<{
    id: string;
    status: RefundRow['status'];
  }>,
): Promise<RefundRow> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, args.orderId))
      .for('update')
      .limit(1);

    if (!order) throw new NotFoundError('el pedido', args.orderId);

    const [payment] = await tx
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.orderId, args.orderId),
          eq(payments.status, 'succeeded'),
        ),
      )
      .orderBy(payments.paidAt)
      .limit(1);

    if (!payment) {
      throw new ConflictError(
        'refund.nothing_collected',
        'Este pedido no registra ningún cobro. No hay nada que devolver.',
      );
    }

    const [given] = await tx
      .select({ total: sql<number>`coalesce(sum(${refunds.amountCents}), 0)::int` })
      .from(refunds)
      .where(
        and(
          eq(refunds.orderId, args.orderId),
          inArray(refunds.status, ['succeeded', 'pending', 'requires_action']),
        ),
      );

    const alreadyReturned = given?.total ?? 0;
    const remaining = payment.amountCents - alreadyReturned;

    if (remaining <= 0) {
      throw new ConflictError(
        'refund.already_full',
        'Este pedido ya se devolvió por completo.',
      );
    }

    const amountCents = args.amountCents === 'full' ? remaining : args.amountCents;

    // Checked here rather than left to the provider: our message names the
    // amounts, and a 400 from someone else's API does not.
    if (amountCents > remaining) {
      throw new ConflictError(
        'refund.exceeds_remaining',
        `Sólo quedan ${formatCentavos(remaining)} por devolver de este pedido.`,
      );
    }

    let stripeRefundId = args.stripeRefundId ?? null;
    let status: RefundRow['status'] = 'succeeded';

    if (payment.provider === 'stripe' && !stripeRefundId) {
      if (!refundThroughProvider) {
        throw new ConflictError(
          'refund.provider_unavailable',
          'Este cobro se hizo en línea y el proveedor de pagos no está configurado.',
        );
      }

      const result = await refundThroughProvider(payment, amountCents);
      stripeRefundId = result.id;
      status = result.status;
    }

    const [row] = await tx
      .insert(refunds)
      .values({
        paymentId: payment.id,
        orderId: args.orderId,
        amountCents,
        reason: args.reason,
        note: args.note ?? null,
        status,
        stripeRefundId,
        actorId: args.actorId,
      })
      .returning();

    const next = await recomputePaymentStatus(tx, args.orderId);
    await assertLegalProjection(tx, args.orderId, next);

    return row;
  });
}

/**
 * Marks a refund as failed, from `refund.failed`.
 *
 * The money came back to the shop's balance, so the order is collected again
 * and the projection has to say so. It is also a human problem — the customer
 * is still owed — which is why the panel shows it in red rather than logging it.
 */
export async function markRefundFailed(
  stripeRefundId: string,
  failureReason: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(refunds)
      .set({ status: 'failed', failureReason })
      .where(eq(refunds.stripeRefundId, stripeRefundId))
      .returning({ orderId: refunds.orderId });

    if (row) await recomputePaymentStatus(tx, row.orderId);
  });
}

/**
 * Runs several ledger writes as one fact.
 *
 * Exported so a Server Action can fold a collection and an operational
 * transition into a single transaction without importing `db` — actions are
 * adapters and have no business holding a database handle.
 */
export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

/**
 * Writes down that a payment was deliberately kept rather than returned.
 *
 * Appended to the settled payment's own note rather than given a table of its
 * own. A retention is not a movement — no pesos changed hands — so inventing a
 * zero-amount row would put a non-event in a book whose every other line is
 * money. Keeping it on the payment means the decision travels with the charge
 * it refers to, and the panel shows it wherever that charge is shown.
 *
 * The author and the moment are written into the text because this is exactly
 * the sentence someone will have to justify months from now.
 */
export async function noteRetainedPayment(
  orderId: string,
  reason: string,
  actorId: string,
): Promise<void> {
  const payment = await db
    .select({ id: payments.id, note: payments.note })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'succeeded')))
    .limit(1);

  const row = payment[0];
  if (!row) return;

  const stamp = new Date().toISOString();
  const line = `[retenido ${stamp} · admin ${actorId}] ${reason}`;

  await db
    .update(payments)
    .set({ note: row.note ? `${row.note}\n${line}` : line })
    .where(eq(payments.id, row.id));
}

/**
 * Switches an order to being paid online, and returns its public token.
 *
 * Used when the counter sends a payment link for an order that was agreed to be
 * paid on handover. Changing the mode re-evaluates the gates in
 * `state-machine.ts`, which is correct: the agreement changed, so what the shop
 * may do before the money arrives changed with it.
 */
export async function setPaymentModeOnline(orderId: string): Promise<void> {
  const [row] = await db
    .update(orders)
    .set({ paymentMode: 'online', updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });

  if (!row) throw new NotFoundError('el pedido', orderId);
}

/** The order's public token, for building a link that points at the storefront. */
export async function publicTokenOf(orderId: string): Promise<string> {
  const [row] = await db
    .select({ publicToken: orders.publicToken })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row) throw new NotFoundError('el pedido', orderId);

  return row.publicToken;
}
