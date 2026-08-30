import { headers } from 'next/headers';

import { stripe, isStripeConfigured } from '@/lib/stripe';
import { claimEvent, handleEvent } from '@/modules/payments/webhook';

/**
 * POST /api/webhooks/stripe
 *
 * The admin is the only consumer of Stripe events, because events write domain
 * state — payments, reservations, refunds — and the storefront does not own any
 * of that (DOCS/PAGOS.md §8.3).
 *
 * ## No service token here
 *
 * Every other route under `/api` requires `STOREFRONT_API_TOKEN`. This one
 * authenticates with the `Stripe-Signature` header instead, which is stronger:
 * a shared bearer proves you were told a secret, an HMAC over the exact body
 * proves the body came from Stripe unmodified. Demanding a token Stripe does
 * not have would simply guarantee no event ever arrives.
 *
 * ## If a `middleware.ts` is ever added
 *
 * `/api/webhooks/*` must be excluded from its matcher. The `authorized`
 * callback in `auth.config.ts` redirects any request outside `/dashboard` to
 * `/dashboard`; applied to this route it would turn a payment notification into
 * a 307 and lose it silently.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    // 503, not 400: nothing is wrong with the request. Stripe retries a 5xx
    // with backoff for three days, which is exactly the behaviour we want if
    // the key is missing during a deploy.
    return new Response('Stripe no está configurado.', { status: 503 });
  }

  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return new Response('Falta la firma.', { status: 400 });
  }

  // The RAW body. `request.json()` would parse and re-serialise it, and any
  // change at all — key order, whitespace — invalidates the HMAC.
  const payload = await request.text();

  let event;

  try {
    event = await stripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    );
  } catch (error) {
    // A failed signature is either a misconfigured secret or someone trying it
    // on. Neither should be retried, so this is a 400 and not a 500.
    console.error('[stripe] firma inválida', error);
    return new Response('Firma inválida.', { status: 400 });
  }

  const isNew = await claimEvent(event.id, event.type);

  if (!isNew) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    /*
     * A 500 asks Stripe to redeliver, which is what we want for a transient
     * failure — a lost database connection, a lock timeout. The event row is
     * already claimed, so redelivery would be skipped as a duplicate; release
     * it so the retry can actually do the work.
     */
    console.error(`[stripe] fallo procesando ${event.type} ${event.id}`, error);
    await releaseEvent(event.id);
    return new Response('Error procesando el evento.', { status: 500 });
  }

  return Response.json({ received: true });
}

async function releaseEvent(id: string) {
  const { db } = await import('@/db');
  const { stripeEvents } = await import('@/db/schema/payments');
  const { eq } = await import('drizzle-orm');

  await db.delete(stripeEvents).where(eq(stripeEvents.id, id));
}
