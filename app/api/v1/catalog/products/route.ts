import { listProducts } from '@/modules/storefront/queries';
import { CATALOG_CACHE, ok, handleError } from '@/lib/api/respond';

/**
 * GET /api/v1/catalog/products?collection=&query=&page=
 *
 * Public and unauthenticated: this is the shop window. Requiring a token here
 * would buy nothing — the data is what any visitor sees — while making the
 * storefront unable to cache it at the edge.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const result = await listProducts({
      collection: searchParams.get('collection') ?? undefined,
      query: searchParams.get('query') ?? undefined,
      page: parsePage(searchParams.get('page')),
    });

    return ok(result, CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Un número de página que siempre es un entero pequeño y positivo.
 *
 * `Number(x) || 1` dejaba pasar cualquier cosa finita: `?page=1e20` producía un
 * `OFFSET` que desborda el `bigint` de Postgres y salía como un **500 en un
 * endpoint público y sin autenticar** — trivial de disparar y ruidoso en los
 * registros.
 *
 * El tope de 10.000 no protege la base (Postgres rechaza antes); protege el
 * contrato: por encima de eso no hay catálogo que paginar, así que pedirlo es un
 * error del cliente y merece una página vacía, no un error del servidor.
 */
function parsePage(raw: string | null): number {
  const page = Number(raw);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), 10_000);
}
