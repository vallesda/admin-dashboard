import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema/sales';
import { payments } from '@/db/schema/payments';
import { getOrderByToken } from '@/modules/storefront/queries';
import { fulfillCheckout } from '@/modules/payments/webhook';
import { isStripeConfigured } from '@/lib/stripe';
import { requireServiceToken } from '@/lib/api/service-auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/**
 * POST /api/v1/orders/:token/confirm
 *
 * The second half of DOCS/PAGOS.md §11.1, which until now was only written
 * down. Stripe's own guidance is that fulfilment must happen from the webhook
 * *and* from the page the shopper lands on:
 *
 * - the webhook, because nobody guarantees the shopper reaches that page — they
 *   can pay and lose their connection a second later;
 * - the landing page, because webhooks are sometimes delayed and the shopper is
 *   looking at the screen *now*. Without this, somebody pays and comes back to
 *   an order that still says "Pendiente".
 *
 * Both call the same idempotent `fulfillCheckout`, so running it twice — or
 * concurrently with the webhook — settles on the same answer.
 */
/*
 * Techo explícito, porque esta ruta habla con Stripe por dentro.
 *
 * El viaje a Stripe no lo controlamos, y sin techo una petición lenta corre
 * hasta el límite del plan consumiendo una invocación entera. 30 s es holgado
 * para abrir una sesión de Checkout y bastante menos que ese límite.
 *
 * Va como `export` de segmento y no en `vercel.json`: en una app de Next es lo
 * que manda, y un glob sobre `app/api/**` habría capado también el cron, que
 * declara 60 s a propósito para poder barrer muchos pedidos de una vez.
 */
export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    requireServiceToken(request);

    const { token } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: unknown;
    };
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    if (!sessionId) {
      return fail(400, 'invalid_payload', 'Falta la sesión de pago.');
    }

    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.publicToken, token))
      .limit(1);

    if (!order) {
      return fail(404, 'not_found', 'Pedido no encontrado.');
    }

    /*
     * The session id arrives in a URL the shopper can edit, so it is checked
     * against the order the token names before anything is fulfilled.
     *
     * Without this, passing someone else's `session_id` would make us fulfil
     * *their* order — a confused deputy. The webhook has no such problem
     * because Stripe tells it which session it is talking about; this endpoint
     * is told by whoever is asking.
     */
    const [attempt] = await db
      .select({ orderId: payments.orderId })
      .from(payments)
      .where(eq(payments.stripeSessionId, sessionId))
      .limit(1);

    if (!attempt || attempt.orderId !== order.id) {
      return fail(
        403,
        'session_mismatch',
        'Esa sesión de pago no pertenece a este pedido.',
      );
    }

    if (isStripeConfigured()) {
      try {
        await fulfillCheckout(sessionId);
      } catch (error) {
        /*
         * Swallowed on purpose. The webhook is the authority and will settle
         * this within seconds; failing the request would show the shopper an
         * error page for an order that is fine. Logged, because a persistent
         * failure here means the webhook is the only thing working.
         */
        console.error('[confirm] no se pudo confirmar desde el retorno', error);
      }
    }

    const fresh = await getOrderByToken(token);

    if (!fresh) {
      return fail(404, 'not_found', 'Pedido no encontrado.');
    }

    return ok(fresh);
  } catch (error) {
    return handleError(error);
  }
}
