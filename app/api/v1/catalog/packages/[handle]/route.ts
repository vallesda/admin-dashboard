import { getPackageByHandle } from '@/modules/storefront/queries';
import { CATALOG_CACHE, ok, fail, handleError } from '@/lib/api/respond';

/** GET /api/v1/catalog/packages/[handle] — one bundle and every line in it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const found = await getPackageByHandle(handle);

    // An unknown or inactive slug is a real 404, never an empty package.
    if (!found) return fail(404, 'not_found', 'Paquete no encontrado.');

    return ok(found, CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}
