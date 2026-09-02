import 'server-only';

/**
 * PAG — opening a collection for an order that already exists.
 *
 * The order comes first and the money second (DOCS/PAGOS.md §4.2). By the time
 * anything here runs, `createOrder` has already priced the lines from the
 * catalogue and reserved the stock inside one transaction, so every amount
 * below is read from the order rather than from anything a client sent.
 *
 * Used from two places with no difference between them:
 *
 * - the storefront, when the shopper chose to pay online;
 * - the admin, when the counter sends a payment link for an order that was
 *   taken over the phone (DOCS/PAGOS.md §11.4).
 *
 * That the second one needed no new code is the evidence that the abstraction
 * sits in the right place.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { orders, orderItems } from '@/db/schema/sales';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { isStripeConfigured } from '@/lib/stripe';
import {
  createCheckoutSession,
  cancelIntent,
  expireSession,
  isCancelableIntent,
  retrieveSession,
} from './stripe';
import { recordPayment, updateAttempt } from './service';
import { findOpenAttempt } from './queries';

export type OpenCheckoutArgs = {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
};

export type OpenCheckoutResult = {
  checkoutUrl: string;
  expiresAt: Date | null;
};

/**
 * Opens (or re-uses) a hosted Checkout Session for an order.
 *
 * Re-use matters more than it looks. A Checkout Session lives 24 hours, and a
 * shopper who goes back and clicks "Pagar" again should land on the session
 * they already have — not on a second one, because two live sessions for one
 * order are two ways to pay it. The idempotency key on the Stripe call is the
 * second line of defence; this lookup is the first.
 */
export async function openCheckout(
  args: OpenCheckoutArgs,
): Promise<OpenCheckoutResult> {
  if (!isStripeConfigured()) {
    /*
     * Deliberately worded for whoever is reading it *here*, which is an
     * operator in the panel. The shopper never sees this string: the storefront
     * catches the failure and falls back to paying at the counter with a
     * message written for them.
     */
    throw new ConflictError(
      'checkout.provider_unavailable',
      'El cobro en línea no está configurado (falta STRIPE_SECRET_KEY). Cobra en el mostrador o pide que se configure Stripe.',
    );
  }

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      publicToken: orders.publicToken,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      deliveryFeeCents: orders.deliveryFeeCents,
      customerEmail: orders.customerEmail,
    })
    .from(orders)
    .where(eq(orders.id, args.orderId))
    .limit(1);

  if (!order) throw new NotFoundError('el pedido', args.orderId);

  if (order.status === 'cancelled' || order.status === 'completed') {
    throw new ConflictError(
      'checkout.order_closed',
      'Este pedido ya está cerrado y no admite un cobro nuevo.',
    );
  }

  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
    throw new ConflictError(
      'checkout.already_settled',
      'Este pedido ya tiene su cobro registrado.',
    );
  }

  const open = await findOpenAttempt(order.id);

  if (open?.hostedVoucherUrl) {
    // An issued OXXO voucher is the live instrument. Opening a new session
    // beside it would give the customer two references for one order and no way
    // to know which one the shop is waiting on.
    return { checkoutUrl: open.hostedVoucherUrl, expiresAt: open.expiresAt };
  }

  const lines = await db
    .select({
      name: orderItems.productName,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  if (lines.length === 0) {
    throw new ConflictError(
      'checkout.empty_order',
      'Este pedido no tiene productos.',
    );
  }

  const session = await createCheckoutSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    publicToken: order.publicToken,
    lines,
    deliveryFeeCents: order.deliveryFeeCents,
    customerEmail: order.customerEmail,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
  });

  if (!session.url) {
    throw new ConflictError(
      'checkout.no_url',
      'El proveedor de pagos no devolvió una página de cobro.',
    );
  }

  const expiresAt = session.expires_at
    ? new Date(session.expires_at * 1000)
    : null;

  // `created`, not `processing`: an unopened checkout URL is not a commitment,
  // and calling it "cobrando" would freeze the order for a customer who may
  // never come back. `recomputePaymentStatus` reads the same distinction.
  await recordPayment({
    orderId: order.id,
    provider: 'stripe',
    status: 'created',
    amountCents: session.amount_total ?? 0,
    actorId: null,
    stripe: { sessionId: session.id, expiresAt },
  });

  return { checkoutUrl: session.url, expiresAt };
}

/**
 * Closes any payment page still open for an order.
 *
 * Called when an order is cancelled — by a person or by the sweep. Two things
 * happen and both matter:
 *
 * 1. **Stripe's side.** El enlace deja de cobrar. Una sesión todavía abierta se
 *    *vence*; un vale de OXXO ya emitido —sesión `complete` e impaga— se cierra
 *    cancelando su PaymentIntent. En ninguno de los dos casos se reembolsa:
 *    cancelar no cuesta comisión y es el único verbo correcto para dinero que
 *    nunca se movió (DOCS/PAGOS.md §12.4).
 *
 *    Antes sólo se hacía lo segundo, y por eso no servía en el caso común: una
 *    sesión que el comprador nunca abrió no tiene `payment_intent`, así que no
 *    había nada que cancelar y la página seguía viva 24 h sobre un pedido
 *    cancelado cuyo stock ya se había liberado.
 * 2. **Ours.** The attempt row is marked `canceled`, so `paymentStatus`
 *    recomputes to `unpaid` instead of sitting at `processing` forever on an
 *    order nobody can pay any more.
 *
 * Deliberately forgiving. A cancelled order with a stale session is untidy; a
 * cancellation that fails because Stripe was unreachable would leave stock
 * reserved, which is worse. Every failure here is logged and swallowed.
 */
export async function voidOpenAttempts(orderId: string): Promise<void> {
  const attempt = await findOpenAttempt(orderId);
  if (!attempt) return;

  if (isStripeConfigured() && attempt.stripeSessionId) {
    try {
      // Re-read rather than trust the stored status: the customer may have paid
      // in the seconds before this ran, and cancelling a succeeded intent is
      // both impossible and a sign we should not be marking anything cancelled.
      const session = await retrieveSession(attempt.stripeSessionId);
      const intent =
        typeof session.payment_intent === 'string'
          ? null
          : session.payment_intent;

      if (session.payment_status !== 'unpaid') return;

      if (session.status === 'open') {
        /*
         * Vencer la sesión es lo que apaga el enlace.
         *
         * Cancelar el intent no lo hacía: una sesión que nadie abrió todavía no
         * tiene `payment_intent` —`null`, verificado contra Stripe—, así que no
         * había nada que cancelar y la página seguía cobrando hasta 24 h
         * después de que el pedido se cancelara y su pescado volviera a la
         * venta. Vencerla cancela también el intent si llegó a existir.
         */
        await expireSession(session.id);
      } else if (intent?.id && isCancelableIntent(intent.status)) {
        // Sesión ya `complete` y aun así impaga: el vale de OXXO emitido.
        // Stripe no deja vencer esa, y lo que sobra es el intent.
        await cancelIntent(intent.id);
      }
    } catch (error) {
      console.error('[checkout] no se pudo cancelar el intento en Stripe', error);
    }
  }

  try {
    await updateAttempt(attempt.id, {
      status: 'canceled',
      failureReason: 'El pedido se canceló antes de completarse el pago.',
    });
  } catch (error) {
    console.error('[checkout] no se pudo marcar el intento como cancelado', error);
  }
}
