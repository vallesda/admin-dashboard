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
      page: Number(searchParams.get('page')) || 1,
    });

    return ok(result, CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}
