import { findZoneForPostalCode } from '@/modules/delivery/queries';
import { quoteDelivery } from '@/modules/delivery/quote';
import { requireServiceToken } from '@/lib/api/service-auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/**
 * GET /api/v1/delivery/quote?postalCode=06500&subtotal=62000
 *
 * Cuánto cuesta llevar un carrito a un código postal, **antes** de que el
 * comprador se comprometa a nada.
 *
 * Existe porque el precio del envío es una de las dos cifras que deciden una
 * compra, y descubrirla al final —o peor, en el correo de confirmación— es cómo
 * una tienda se gana un carrito abandonado y un reclamo. La tienda pinta esta
 * respuesta en el resumen mientras se escribe la dirección.
 *
 * No decide nada: el importe que se cobra lo vuelve a cotizar `createOrder`
 * dentro de su transacción, desde el mismo código postal. Esto es una vista
 * previa, y tratarla como autoritativa sería `RN-008` al revés.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    requireServiceToken(request);

    const url = new URL(request.url);
    const postalCode = (url.searchParams.get('postalCode') ?? '').trim();
    const subtotal = Number(url.searchParams.get('subtotal') ?? '0');

    if (!/^[0-9]{5}$/.test(postalCode)) {
      return fail(
        400,
        'invalid_payload',
        'El código postal son 5 dígitos. Ejemplo: 06000.',
      );
    }

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return fail(400, 'invalid_payload', 'Subtotal inválido.');
    }

    const zone = await findZoneForPostalCode(postalCode);
    const quote = quoteDelivery(zone, Math.trunc(subtotal));

    // Un código postal fuera de cobertura es una respuesta legítima, no un
    // error: 200 con `covered: false`. Un 404 haría que la tienda no pudiera
    // distinguirlo de un endpoint mal escrito.
    return ok(quote);
  } catch (error) {
    return handleError(error);
  }
}
