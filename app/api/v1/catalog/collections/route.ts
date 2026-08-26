import { listCollections } from '@/modules/storefront/queries';
import { CATALOG_CACHE, ok, handleError } from '@/lib/api/respond';

/** GET /api/v1/catalog/collections — categories that have something to sell. */
export async function GET() {
  try {
    return ok(await listCollections(), CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}
