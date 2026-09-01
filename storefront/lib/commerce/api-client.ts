import 'server-only';

/**
 * The only module that knows the admin API exists.
 *
 * Everything else imports from `lib/commerce`. That indirection is the whole
 * reason this storefront can move to its own repository later without touching
 * a single page: the seam changes, the pages do not.
 *
 * The service token never reaches the browser. Every call here runs on the
 * storefront's server — from a Server Component or a Server Action — because a
 * token shipped to the client is a token anyone can read.
 */
const BASE_URL = process.env.ADMIN_API_URL;
const TOKEN = process.env.STOREFRONT_API_TOKEN;

export class CommerceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'CommerceError';
    this.code = code;
    this.status = status;
  }
}

type ApiEnvelope<T> = { data: T } | { error: { code: string; message: string } };

async function request<T>(
  path: string,
  init?: RequestInit & { authenticated?: boolean; revalidate?: number },
): Promise<T> {
  if (!BASE_URL) {
    throw new CommerceError(
      'not_configured',
      'ADMIN_API_URL no está configurado.',
      500,
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (init?.authenticated) {
    if (!TOKEN) {
      throw new CommerceError(
        'not_configured',
        'STOREFRONT_API_TOKEN no está configurado.',
        500,
      );
    }
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    // Catalogue reads are cached; anything with a body is a mutation and is not.
    next: init?.body ? undefined : { revalidate: init?.revalidate ?? 60 },
    cache: init?.body ? 'no-store' : undefined,
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if ('error' in payload) {
    throw new CommerceError(
      payload.error.code,
      payload.error.message,
      response.status,
    );
  }

  return payload.data;
}

export const api = {
  get: <T>(path: string, options?: { authenticated?: boolean; revalidate?: number }) =>
    request<T>(path, options),

  post: <T>(path: string, body: unknown, options?: { authenticated?: boolean }) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      authenticated: options?.authenticated,
    }),
};
