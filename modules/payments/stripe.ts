import 'server-only';

/**
 * PAG — everything that knows Stripe exists.
 *
 * The seam. `service.ts` holds the money rules and never imports this file;
 * this file translates between Stripe's vocabulary and ours. Two consequences
 * worth stating:
 *
 * - the ledger can be tested without a network;
 * - a second provider would be a sibling of this file, not a rewrite of the
 *   service.
 *
 * Every write carries an idempotency key. Stripe stores the result of the first
 * request per key for 24 hours and returns exactly that on retries, including
 * 500s — which is what makes a double-clicked button, a retried action and a
 * redelivered webhook harmless.
 */
import type Stripe from 'stripe';

import { stripe, isAllowedReturnUrl } from '@/lib/stripe';
import { ConflictError } from '@/lib/errors';
import type { PaymentRow, RefundStatus } from '@/db/schema/payments';

/** MXN is a two-decimal currency, so `totalCents` is Stripe's `unit_amount`. */
export const CURRENCY = 'mxn';

/**
 * Card only, on purpose.
 *
 * Dynamic payment methods would also surface OXXO and SPEI, and both are
 * *delayed notification* methods: the shop finds out a day later whether it was
 * paid. For perishable stock that means either freezing a kilo of fish for
 * three days against a voucher nobody may ever pay, or preparing an order that
 * has not been paid for. The shop chose neither.
 *
 * Naming the list explicitly rather than leaving it to the Dashboard is the
 * point: enabling a method there must not silently change what this shop sells
 * on credit. Adding SPEI later — it settles in ~30 minutes, which is a very
 * different proposition — is a one-line change here plus a Dashboard toggle.
 */
export const PAYMENT_METHOD_TYPES = ['card'] as const;

export type CheckoutLine = {
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type CreateSessionArgs = {
  orderId: string;
  orderNumber: number;
  publicToken: string;
  lines: CheckoutLine[];
  deliveryFeeCents: number;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Opens a hosted Checkout Session for an order that already exists.
 *
 * The order is created and its stock reserved *before* this runs
 * (DOCS/PAGOS.md §4.2), so the amounts here are read from the order rather than
 * from anything a client sent. A crafted payload can change which products were
 * ordered; it cannot change what they cost.
 */
export async function createCheckoutSession(
  args: CreateSessionArgs,
): Promise<Stripe.Checkout.Session> {
  for (const url of [args.successUrl, args.cancelUrl]) {
    if (!isAllowedReturnUrl(url)) {
      throw new ConflictError(
        'checkout.return_url_not_allowed',
        'La URL de retorno no pertenece a un origen autorizado.',
      );
    }
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    args.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: CURRENCY,
        unit_amount: line.unitPriceCents,
        product_data: { name: line.name },
      },
    }));

  // Delivery is a line, not a discount on the total: the customer should see
  // what they are paying for on Stripe's page too, and the sum has to match
  // `orders.totalCents` exactly or reconciliation starts guessing.
  if (args.deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: args.deliveryFeeCents,
        product_data: { name: 'Envío a domicilio' },
      },
    });
  }

  return stripe().checkout.sessions.create(
    {
      mode: 'payment',
      ui_mode: 'hosted_page',
      line_items: lineItems,
      // Both are set: `client_reference_id` is what shows in the Stripe
      // Dashboard beside the payment, and `metadata` is what the webhook reads.
      client_reference_id: args.orderId,
      metadata: {
        orderId: args.orderId,
        orderNumber: String(args.orderNumber),
        publicToken: args.publicToken,
      },
      // Carried onto the PaymentIntent as well, so a refund issued from the
      // Stripe Dashboard can still be traced back to an order.
      payment_intent_data: {
        metadata: { orderId: args.orderId, orderNumber: String(args.orderNumber) },
      },
      customer_email: args.customerEmail ?? undefined,
      payment_method_types: [...PAYMENT_METHOD_TYPES],
      locale: 'es-419',
      success_url: `${args.successUrl}${args.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl,
    },
    // One session per order. A double-clicked "Pagar" returns the same session
    // rather than opening a second one that could also be paid.
    { idempotencyKey: `order:${args.orderId}:session` },
  );
}

/** Re-reads a session with what the handler needs to decide. */
export async function retrieveSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'payment_intent.latest_charge'],
  });
}

/**
 * The refund branch injected into `service.refundOrder`.
 *
 * Matches the signature the service expects, which is why it takes the payment
 * row rather than a Stripe id: the service should not have to know which of the
 * row's several provider columns is the right one to send.
 */
export async function providerRefund(
  payment: PaymentRow,
  amountCents: number,
): Promise<{ id: string; status: RefundStatus }> {
  if (!payment.stripePaymentIntentId) {
    throw new ConflictError(
      'refund.no_payment_intent',
      'Este cobro no tiene un pago de Stripe asociado.',
    );
  }

  const refund = await stripe().refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      amount: amountCents,
      metadata: { paymentId: payment.id, orderId: payment.orderId },
    },
    {
      // The amount is part of the key so a *deliberate* second partial refund
      // of a different amount is not swallowed as a duplicate, while a retry of
      // the same one is.
      idempotencyKey: `refund:${payment.id}:${amountCents}`,
    },
  );

  return { id: refund.id, status: toRefundStatus(refund.status) };
}

/**
 * Cancels an uncompleted PaymentIntent instead of refunding it.
 *
 * An issued-but-unpaid OXXO voucher has taken no money, so there is nothing to
 * give back — and cancelling costs no processing fee where a refund would.
 * Stripe only allows this while the intent is still open, which is exactly the
 * condition the caller checks.
 */
export async function cancelIntent(paymentIntentId: string): Promise<void> {
  await stripe().paymentIntents.cancel(paymentIntentId);
}

const CANCELABLE_INTENT_STATUSES = new Set([
  'requires_payment_method',
  'requires_capture',
  'requires_confirmation',
  'requires_action',
]);

export function isCancelableIntent(status: string | null | undefined): boolean {
  return status ? CANCELABLE_INTENT_STATUSES.has(status) : false;
}

/** Stripe's refund status vocabulary is ours, minus the nulls. */
export function toRefundStatus(status: string | null): RefundStatus {
  switch (status) {
    case 'pending':
    case 'requires_action':
    case 'succeeded':
    case 'failed':
    case 'canceled':
      return status;
    default:
      // A refund Stripe accepted but has not classified is treated as pending:
      // it counts against the balance, so no second refund can go out for the
      // same pesos while we wait to hear.
      return 'pending';
  }
}

/**
 * A payment method named the way a customer would say it.
 *
 * Written here, on the admin side, on purpose. The alternative — sending
 * `payment_method_type: "oxxo"` over the API and keeping a dictionary in the
 * storefront — is exactly the leak of provider knowledge that would tie the
 * separate system to Stripe (DOCS/PAGOS.md §8.2). A new method appears here and
 * the storefront never notices.
 */
export function methodLabel(type: string | null | undefined): string {
  switch (type) {
    case 'card':
      return 'Tarjeta';
    // Kept although OXXO is no longer offered: orders paid with a voucher
    // before the shop dropped the method still have to render their own
    // history correctly.
    case 'oxxo':
      return 'OXXO';
    case 'customer_balance':
      return 'Transferencia SPEI';
    case 'link':
      return 'Link';
    default:
      return 'Pago en línea';
  }
}
