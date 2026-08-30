import { listHomeShelf } from '@/modules/storefront/queries';
import { CATALOG_CACHE, ok, handleError } from '@/lib/api/respond';

/**
 * GET /api/v1/catalog/shelf
 *
 * The home shelf: featured categories and curated packages, merged and ordered.
 * Both are filtered to things that actually have something to sell, so the
 * storefront never has to decide whether a tile is worth rendering.
 */
export async function GET() {
  try {
    return ok(await listHomeShelf(), CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}
