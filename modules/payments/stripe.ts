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
 * Delayed-notification methods, excluded on purpose.
 *
 * `payment_method_types` used to be hardcoded to `['card']` here. That is the
 * one parameter Stripe now tells every integration not to send: it freezes the
 * method list at deploy time, so wallets (Apple Pay, Google Pay, Link) that
 * cost nothing to accept and measurably lift conversion never appear, and the
 * only way to change anything is a release.
 *
 * The business rule underneath it was never "cards only" — it was *"nothing
 * that pays us tomorrow"*. OXXO and SPEI are **delayed notification** methods:
 * the shop learns a day later whether it was paid. For perishable stock that
 * means freezing a kilo of fish against a voucher nobody may ever pay. So the
 * rule is expressed as what it actually is — an exclusion of the delayed
 * methods — and everything instant is left to Stripe's dynamic selection and
 * the Dashboard.
 *
 * Stated in code and not only in the Dashboard for the reason the old comment
 * gave, which still holds: enabling a method there must not silently change
 * what this shop sells on credit. This list is the guard that survives someone
 * clicking a toggle.
 *
 * Enabling SPEI later — it settles in ~30 minutes, a very different
 * proposition — means dropping `customer_balance` from this list. The
 * `async_payment_succeeded` / `async_payment_failed` handlers in `webhook.ts`
 * and the voucher branches in `checkout.ts` are already written for that day.
 */
export const EXCLUDED_PAYMENT_METHOD_TYPES = [
  'oxxo',
  'customer_balance',
] as const satisfies readonly Stripe.Checkout.SessionCreateParams.ExcludedPaymentMethodType[];

/**
 * The label Stripe groups these sessions under in the Dashboard.
 *
 * Required from API version `2026-03-25.dahlia` onward, and the suffix of eight
 * random letters is Stripe's convention, not decoration: it keeps this shop's
 * funnel distinguishable from every other integration that also called itself
 * `checkout`. Generated once and then **constant** — a value regenerated per
 * request would put every session in a group of one and report nothing.
 */
export const INTEGRATION_IDENTIFIER = 'amoramar-hosted-checkout-fqishqrr';

/**
 * An optional Payment Method Configuration id.
 *
 * When set, it decides which methods Checkout offers, replacing the Dashboard
 * default. Left unset in every environment so far: the exclusion list above
 * already encodes the only rule the shop has, and a configuration is one more
 * object to keep in step across sandbox and production.
 */
function paymentMethodConfiguration(): string | undefined {
  return process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION || undefined;
}

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
      // No `payment_method_types`. Stripe picks from what the Dashboard (or a
      // configuration) enables, minus the delayed ones this shop cannot carry.
      excluded_payment_method_types: [...EXCLUDED_PAYMENT_METHOD_TYPES],
      payment_method_configuration: paymentMethodConfiguration(),
      integration_identifier: INTEGRATION_IDENTIFIER,
      locale: 'es-419',
      success_url: `${args.successUrl}${args.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl,
    },
    // One session per order. A double-clicked "Pagar" returns the same session
    // rather than opening a second one that could also be paid.
    { idempotencyKey: `order:${args.orderId}:session` },
  );
}

/**
 * Cierra la página de cobro para que deje de poder pagarse.
 *
 * Sin esto, cancelar un pedido dejaba viva su sesión de Checkout hasta 24 h.
 * `cancelIntent` no basta: una sesión que el comprador **nunca abrió** no tiene
 * `payment_intent` todavía —comprobado contra Stripe: `payment_intent: null` en
 * una sesión recién creada—, así que no había nada que cancelar y el enlace
 * seguía cobrando.
 *
 * La consecuencia era la peor de este sistema: el barrido libera el pescado y
 * lo vende a otro, alguien abre el enlace viejo, paga, y `fulfillCheckout`
 * registra un cobro contra un pedido cancelado y sin existencias. Dinero
 * recibido por algo que ya no hay.
 *
 * Vencer la sesión cancela además el PaymentIntent asociado si llegó a
 * existir, así que sustituye a `cancelIntent` siempre que la sesión siga
 * abierta. El vale de OXXO es el otro caso: ahí la sesión está `complete` y
 * Stripe no permite vencerla, y es el intent lo que hay que cancelar.
 */
export async function expireSession(sessionId: string): Promise<void> {
  await stripe().checkout.sessions.expire(sessionId);
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
