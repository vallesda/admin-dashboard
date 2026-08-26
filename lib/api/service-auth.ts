import 'server-only';

/**
 * Authentication for server-to-server API calls.
 *
 * The storefront's *server* calls this API with a shared secret. The browser
 * never does: a token shipped to the client is a token anyone can read, and
 * this one is worth more than the data it fetches.
 *
 * Deliberately not the admin's session auth. A storefront compromise must not
 * yield an admin session, so the two credentials have nothing in common.
 */
export class ServiceAuthError extends Error {
  constructor(message = 'Credencial de servicio inválida.') {
    super(message);
    this.name = 'ServiceAuthError';
  }
}

/** Constant-time comparison, so response timing cannot reveal the token. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

export function isServiceAuthConfigured(): boolean {
  return Boolean(process.env.STOREFRONT_API_TOKEN);
}

/**
 * Asserts the request carries the service token.
 *
 * Fails closed when the token is not configured: an unset secret must mean
 * "nobody gets in", never "everybody does".
 */
export function requireServiceToken(request: Request): void {
  const expected = process.env.STOREFRONT_API_TOKEN;

  if (!expected) {
    throw new ServiceAuthError(
      'STOREFRONT_API_TOKEN no está configurado en el servidor.',
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!provided || !safeEqual(provided, expected)) {
    throw new ServiceAuthError();
  }
}
