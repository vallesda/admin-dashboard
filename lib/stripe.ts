import 'server-only';

/**
 * The Stripe client.
 *
 * Lives in `lib/` and not in `modules/payments/` because it is infrastructure,
 * like `db`. The ledger in `modules/payments/service.ts` deliberately does not
 * import it: refunding through a provider is injected, so the money rules stay
 * testable without a network and a second provider could exist without touching
 * them.
 *
 * SERVER ONLY, and specifically *admin* only. The storefront never sees a Stripe
 * key — not even the publishable one, because hosted Checkout does not need it
 * (DOCS/PAGOS.md §3). The day the storefront becomes its own deployment, it
 * carries no payment credentials at all.
 */
import Stripe from 'stripe';

/**
 * Pinned, never floating.
 *
 * A floating version means Stripe can change the shape of an object on a
 * Tuesday and break reconciliation without anyone having deployed anything.
 * This is the version the installed SDK's types describe; upgrading it is a
 * deliberate commit that also updates the SDK.
 */
export const STRIPE_API_VERSION = '2026-08-26.dahlia' as const;

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * The shared client, created on first use.
 *
 * Lazy rather than module-level so importing anything in the payments module
 * does not throw at build time on a machine with no keys. The panel's manual
 * collection path works perfectly well without Stripe configured, and it should
 * not be taken down by the absence of a provider it never calls.
 */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      throw new StripeNotConfiguredError();
    }

    client = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      // Shows up in Stripe's logs beside every request, which is what makes a
      // support conversation about a specific charge possible.
      appInfo: { name: 'Amor a Mar Admin', url: 'https://amoramar.mx' },
      // Two retries with Stripe's own backoff. Combined with the idempotency
      // keys every write here carries, a retry cannot double-charge.
      maxNetworkRetries: 2,
    });
  }

  return client;
}

export class StripeNotConfiguredError extends Error {
  readonly code = 'stripe.not_configured';

  constructor() {
    super(
      'El cobro en línea no está configurado. Registra el pago manualmente o pide que se configure Stripe.',
    );
    this.name = 'StripeNotConfiguredError';
  }
}

/**
 * The origins a Checkout return URL may point at.
 *
 * The storefront sends its own return URLs, because a system that is about to
 * live in another repository cannot have its domain hard-coded here. Accepting
 * *any* URL, though, would be an open redirect wearing the shop's branding —
 * Stripe would happily bounce a customer to somewhere else after they paid.
 * This allow-list is what lets the storefront choose its path while the admin
 * keeps deciding its domain.
 */
export function allowedReturnOrigins(): string[] {
  return (process.env.STOREFRONT_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedReturnUrl(candidate: string): boolean {
  const allowed = allowedReturnOrigins();
  if (allowed.length === 0) return false;

  try {
    const url = new URL(candidate);
    // Compared by origin, not by prefix: `https://amoramar.mx.evil.com` starts
    // with an allowed string and is not an allowed origin.
    return allowed.includes(url.origin);
  } catch {
    return false;
  }
}
