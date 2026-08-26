import { getProductByHandle } from '@/modules/storefront/queries';
import { CATALOG_CACHE, ok, fail, handleError } from '@/lib/api/respond';

/** GET /api/v1/catalog/products/:handle — one product by slug. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const product = await getProductByHandle(handle);

    if (!product) {
      return fail(404, 'not_found', 'Producto no encontrado.');
    }

    return ok(product, CATALOG_CACHE);
  } catch (error) {
    return handleError(error);
  }
}
