import { releaseAbandonedCheckouts } from '@/modules/payments/sweeper';

/**
 * GET/POST /api/cron/release-reservations
 *
 * The scheduled half of DOCS/PAGOS.md §10: puts back stock that is being held
 * for an online payment that never arrived.
 *
 * Runs alongside the webhook, not instead of it. `checkout.session.expired`
 * handles almost every case within seconds; this catches the ones where the
 * event never reached us at all — Stripe gives up retrying after three days,
 * and an endpoint that was down longer than that loses the event for good.
 *
 * Daily is enough. The reservation it releases has already been dead for a day
 * by the time this is the mechanism that notices.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Authenticated with `CRON_SECRET`, not the storefront token.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on scheduled
 * invocations. Reusing `STOREFRONT_API_TOKEN` would mean a storefront
 * compromise could cancel every open order in the shop, which is a much larger
 * blast radius than reading the catalogue.
 *
 * Fails closed: an unset secret means nobody gets in, never everybody.
 */
function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${expected}`;
}

async function run(request: Request) {
  if (!authorize(request)) {
    return new Response('No autorizado.', { status: 401 });
  }

  const result = await releaseAbandonedCheckouts();

  // Logged as well as returned: the response goes to a scheduler nobody reads,
  // and releasing a customer's order is the kind of thing that has to be
  // explainable afterwards.
  if (result.released.length > 0 || result.failed.length > 0) {
    console.log(
      `[cron] reservas liberadas: ${result.released.length}, fallidas: ${result.failed.length}`,
      result,
    );
  }

  return Response.json({
    released: result.released.length,
    failed: result.failed.length,
    orders: result.released.map((r) => r.orderNumber),
  });
}

// GET because that is what Vercel Cron issues; POST so it can also be triggered
// by hand from a terminal without pretending to be a scheduler.
export const GET = run;
export const POST = run;
