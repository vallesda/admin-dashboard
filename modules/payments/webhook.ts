import 'server-only';

/**
 * PAG — what Stripe tells us, turned into facts about orders.
 *
 * ## Why the webhook is the truth and the return page is a courtesy
 *
 * Nobody guarantees the shopper reaches the page they are redirected to after
 * paying: they can pay successfully and lose their connection a second later.
 * So fulfilment cannot hang off that page. But a webhook can also be delayed,
 * and the shopper is looking at the screen *now* — so the return page calls the
 * same function. Both paths run `fulfillCheckout`, and that function is
 * idempotent, which is what makes running it twice uninteresting.
 *
 * ## Never trust the event body
 *
 * Stripe delivers events more than once, and delivery order is not guaranteed.
 * Every handler here re-reads the object from the API and decides from the
 * current state, so an `async_payment_succeeded` that arrives before its
 * `completed` sibling still produces the right answer.
 */
import type Stripe from 'stripe';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema/sales';
import { payments, refunds, stripeEvents } from '@/db/schema/payments';
import { changeOrderStatus } from '@/modules/sales/service';
import { recordPayment, updateAttempt, markRefundFailed } from './service';
import { retrieveSession, toRefundStatus } from './stripe';

/**
 * Registers an event and reports whether it is new.
 *
 * `ON CONFLICT DO NOTHING` that touches no rows means "already handled": answer
 * 200 and do nothing. One line of SQL, and the difference between confirming an
 * order once or three times.
 */
export async function claimEvent(
  id: string,
  type: string,
): Promise<boolean> {
  const inserted = await db
    .insert(stripeEvents)
    .values({ id, type })
    .onConflictDoNothing({ target: stripeEvents.id })
    .returning({ id: stripeEvents.id });

  return inserted.length > 0;
}

async function markProcessed(id: string): Promise<void> {
  await db
    .update(stripeEvents)
    .set({ processedAt: new Date() })
    .where(eq(stripeEvents.id, id));
}

/**
 * The single fulfilment function, called from the webhook and the return page.
 *
 * Safe to run repeatedly and concurrently for the same session — the row lock
 * inside `updateAttempt` serialises the writes and the projection recomputes to
 * the same answer either way.
 */
export async function fulfillCheckout(sessionId: string): Promise<void> {
  const session = await retrieveSession(sessionId);

  const [attempt] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeSessionId, sessionId))
    .limit(1);

  const orderId = attempt?.orderId ?? session.metadata?.orderId;
  if (!orderId) return;

  const intent =
    typeof session.payment_intent === 'string'
      ? null
      : (session.payment_intent as Stripe.PaymentIntent | null);

  const charge =
    intent && typeof intent.latest_charge !== 'string'
      ? (intent.latest_charge as Stripe.Charge | null)
      : null;

  const methodType =
    charge?.payment_method_details?.type ??
    intent?.payment_method_types?.[0] ??
    null;

  const voucher = intent?.next_action?.oxxo_display_details ?? null;

  // `unpaid` here is the OXXO case: the form was submitted and a voucher
  // exists, but no pesos have moved. It is emphatically not a collection, and
  // the gates in `state-machine.ts` keep the order from advancing on it.
  if (session.payment_status === 'unpaid') {
    if (!attempt) return;

    await updateAttempt(attempt.id, {
      status: 'processing',
      paymentMethodType: methodType,
      hostedVoucherUrl: voucher?.hosted_voucher_url ?? null,
      expiresAt: voucher?.expires_after
        ? new Date(voucher.expires_after * 1000)
        : attempt.expiresAt,
    });

    return;
  }

  const amountCents = session.amount_total ?? attempt?.amountCents ?? 0;
  if (amountCents <= 0) return;

  await db.transaction(async (tx) => {
    if (attempt) {
      if (attempt.status === 'succeeded') return; // already fulfilled

      await updateAttempt(
        attempt.id,
        {
          status: 'succeeded',
          paymentMethodType: methodType,
          stripeChargeId: charge?.id ?? null,
        },
        tx,
      );
    } else {
      // No attempt row: the session was created somewhere else, or ours was
      // lost. Recording it is better than dropping a real payment on the floor.
      await recordPayment(
        {
          orderId,
          provider: 'stripe',
          status: 'succeeded',
          amountCents,
          actorId: null,
          stripe: {
            sessionId: session.id,
            paymentIntentId: intent?.id ?? null,
            chargeId: charge?.id ?? null,
            paymentMethodType: methodType,
          },
        },
        tx,
      );
    }

    if (intent?.id && attempt && !attempt.stripePaymentIntentId) {
      await tx
        .update(payments)
        .set({ stripePaymentIntentId: intent.id })
        .where(eq(payments.id, attempt.id));
    }

    /*
     * Gate P1: paying is what confirms an online order.
     *
     * Not a new transition — the same `pending → confirmed` a person makes,
     * fired by Stripe instead. `actorId` is null because nobody at the shop
     * touched it, which is the convention `createOrder` already uses for
     * orders that came in through the storefront.
     */
    const [order] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (order?.status === 'pending') {
      await changeOrderStatus(orderId, 'confirmed', null, { tx });
    }
  });
}

/**
 * A voucher expired, or a delayed payment failed.
 *
 * The stock goes back on sale. This is the counterpart of the reservation
 * `createOrder` took: without it, every unpaid voucher would freeze a kilo of
 * fish forever and `RN-003` would be enforced against a number that no longer
 * means anything (DOCS/PAGOS.md §10).
 */
export async function failCheckout(
  sessionId: string,
  reason: string,
): Promise<void> {
  const [attempt] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeSessionId, sessionId))
    .limit(1);

  if (!attempt) return;

  await updateAttempt(attempt.id, {
    status: 'expired',
    failureReason: reason,
  });

  await releaseIfStillOpen(attempt.orderId);
}

/**
 * Cancels an order that never got paid, and only if that is still true.
 *
 * Re-read inside the same call rather than trusted from the event: between
 * Stripe deciding a voucher expired and this running, the customer may have
 * walked into the shop and paid at the counter. Cancelling that order would
 * take back fish somebody already bought.
 */
async function releaseIfStillOpen(orderId: string): Promise<void> {
  const [order] = await db
    .select({ status: orders.status, paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return;
  if (order.status === 'cancelled' || order.status === 'completed') return;
  if (order.paymentStatus !== 'unpaid') return;

  await changeOrderStatus(orderId, 'cancelled', null);
}

/**
 * A refund Stripe knows about — including one issued from its own Dashboard.
 *
 * That last case is the reason this creates the row when it is missing. The
 * owner refunding from their phone is a real workflow, and a handler that only
 * reacted to refunds *we* originated would let the panel and Stripe drift apart
 * in silence. `actorId` stays null and the note says where it came from.
 */
export async function syncRefund(refund: Stripe.Refund): Promise<void> {
  const status = toRefundStatus(refund.status);

  const [existing] = await db
    .select({ id: refunds.id })
    .from(refunds)
    .where(eq(refunds.stripeRefundId, refund.id))
    .limit(1);

  if (existing) {
    if (status === 'failed') {
      await markRefundFailed(refund.id, refund.failure_reason ?? null);
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(refunds)
        .set({ status, failureReason: refund.failure_reason ?? null })
        .where(eq(refunds.id, existing.id));
    });

    return;
  }

  const intentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : (refund.payment_intent?.id ?? null);

  if (!intentId) return;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, intentId))
    .limit(1);

  if (!payment) return;

  const { refundOrder } = await import('./service');

  await refundOrder({
    orderId: payment.orderId,
    amountCents: refund.amount,
    reason: 'requested_by_customer',
    note: 'Registrado desde el Dashboard de Stripe.',
    actorId: null,
    stripeRefundId: refund.id,
  });
}

/**
 * Routes one verified event.
 *
 * Deliberately small and free of `switch` fallthrough cleverness: this is the
 * function that decides whether a shop gets paid, and it should be readable at
 * three in the morning.
 */
export async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      await fulfillCheckout(session.id);
      break;
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await failCheckout(session.id, 'El pago diferido no se completó.');
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await failCheckout(session.id, 'La sesión de pago venció sin cobrarse.');
      break;
    }

    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed': {
      await syncRefund(event.data.object as Stripe.Refund);
      break;
    }

    default:
      // Everything else is acknowledged and ignored. Answering 200 to an event
      // we do not handle is correct: a 4xx would make Stripe retry it for three
      // days and eventually disable the endpoint.
      break;
  }

  await markProcessed(event.id);
}
