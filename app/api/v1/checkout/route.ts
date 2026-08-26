import { checkout, checkoutSchema } from '@/modules/storefront/checkout';
import { requireServiceToken } from '@/lib/api/service-auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/**
 * POST /api/v1/checkout
 *
 * The only write the storefront can perform. Authenticated with the service
 * token, because unlike the catalogue this one moves stock: every order places
 * a real reservation, so an open endpoint would let anyone exhaust inventory
 * with orders nobody intends to pay for.
 *
 * The payload carries product ids and quantities. It does NOT carry prices or
 * totals — those come from the catalogue inside the transaction (RN-008), and a
 * crafted body cannot change them.
 */
export async function POST(request: Request) {
  try {
    requireServiceToken(request);

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponseFromZod(parsed.error.flatten().fieldErrors);
    }

    const result = await checkout(parsed.data);

    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

function NextResponseFromZod(fieldErrors: Record<string, string[] | undefined>) {
  const first = Object.values(fieldErrors).flat().filter(Boolean)[0];

  return fail(
    400,
    'invalid_payload',
    first ?? 'El pedido no es válido.',
  );
}
