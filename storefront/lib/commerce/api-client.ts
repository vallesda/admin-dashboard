import 'server-only';

import { connection } from 'next/server';

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

  /*
   * `options` para poder pasar `cause`: cuando el fallo es un tiempo agotado o
   * una caída de red, el error original es lo único que dice *qué* pasó, y
   * perderlo deja un registro que sólo sabe decir «no contestó».
   */
  constructor(
    code: string,
    message: string,
    status: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
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

  /*
   * Ninguna lectura del admin ocurre durante `next build`.
   *
   * `connection()` corta el prerender aquí: lo que sigue sólo se ejecuta con
   * una petición real delante. Sin esto, Next prerenderizaba las páginas
   * informativas y el `fetch` salía de verdad en el build, así que un admin
   * caído, todavía sin desplegar o detrás de Deployment Protection no degradaba
   * la tienda: reventaba su despliegue en «Collecting page data». Cada deploy
   * de la tienda quedaba acoplado a que el otro servicio estuviera vivo, que es
   * exactamente lo que separarlos en dos servicios existe para evitar.
   *
   * Un `try/catch` NO sirve para esto: en Next 16 un fetch que falla durante el
   * prerender aborta la generación de la página aunque el error esté atrapado.
   * Se comprobó con los `.catch(() => [])` que ya existían en `app/layout.tsx`
   * y en el sitemap — el build seguía muriendo.
   *
   * No se pierde el cacheo: `next.revalidate` de abajo sigue guardando la
   * respuesta en la Data Cache, así que la primera visita la paga una vez y las
   * demás la leen de ahí. Lo que se deja de hacer es congelar HTML en el build
   * con datos de un catálogo que cambia todos los días.
   */
  await connection();

  /*
   * Un techo al tiempo que la tienda espera al admin.
   *
   * Sin `signal`, un admin lento no degradaba la tienda: la **colgaba**. La
   * petición se quedaba esperando hasta el límite de la plataforma, y como ni la
   * portada ni el buscador tienen `.catch`, un incidente pequeño en un servicio
   * se convertía en la tienda entera caída y en invocaciones lentas
   * acumulándose.
   *
   * Fallar en ocho segundos es peor que responder rápido y mejor que no
   * responder: el error sí tiene manejo, la espera indefinida no. Las escrituras
   * llevan más margen porque `POST /checkout` habla con Stripe por dentro y ese
   * viaje no lo controlamos.
   */
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(init?.body ? 20_000 : 8_000),
      // Catalogue reads are cached; anything with a body is a mutation and is not.
      next: init?.body ? undefined : { revalidate: init?.revalidate ?? 60 },
      cache: init?.body ? 'no-store' : undefined,
    });
  } catch (error) {
    // `TimeoutError` y los fallos de red salen como el mismo tipo de problema
    // para quien llama: el admin no contestó. Que sea un `CommerceError` es lo
    // que permite que las páginas que ya lo manejan sigan manejándolo.
    throw new CommerceError(
      'upstream_unavailable',
      'No pudimos contactar con la tienda. Inténtalo en un momento.',
      503,
      { cause: error },
    );
  }

  /*
   * Mirar `response.ok` **antes** de parsear.
   *
   * Se hacía al revés, y un 502 con la página de error HTML de la plataforma
   * lanzaba `SyntaxError` en vez de `CommerceError` — con lo que todo el manejo
   * de errores de arriba (`error.status === 404`, `=== 422`) dejaba de
   * dispararse justo cuando hacía falta.
   */
  const payload = await response
    .json()
    .then((body) => body as ApiEnvelope<T>)
    .catch(() => null);

  if (!payload) {
    throw new CommerceError(
      'upstream_unreadable',
      'La tienda respondió algo que no entendemos.',
      response.status,
    );
  }

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
