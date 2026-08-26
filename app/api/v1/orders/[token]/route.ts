import { getOrderByToken } from '@/modules/storefront/queries';
import { requireServiceToken } from '@/lib/api/service-auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/**
 * GET /api/v1/orders/:token — order confirmation.
 *
 * The token is a random uuid, not the order number: `orderNumber` is sequential
 * (`GENERATED ALWAYS AS IDENTITY`), so addressing orders by it would let anyone
 * walk 1, 2, 3… and read every customer's name and delivery address.
 *
 * Still behind the service token as well. The uuid is unguessable, but it also
 * travels in URLs, referrers and browser history, and defence in depth costs
 * nothing here.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    requireServiceToken(request);

    const { token } = await params;
    const order = await getOrderByToken(token);

    if (!order) {
      return fail(404, 'not_found', 'Pedido no encontrado.');
    }

    // Never cached: status changes as the shop works the order.
    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}
