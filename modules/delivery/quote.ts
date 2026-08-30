/**
 * DEL — cuánto cuesta llevarlo. Puro: sin base de datos, sin sesión.
 *
 * Separado del servicio por la misma razón que `state-machine.ts` lo está de
 * `sales/service.ts`: esto decide lo que se le cobra a una persona, y una regla
 * que sólo puede ejercitarse escribiendo filas en Postgres es una regla que
 * nadie ejercita.
 *
 * La cotización tiene exactamente tres desenlaces y conviene nombrarlos, porque
 * el tercero se confunde con el segundo todo el tiempo:
 *
 * 1. **se cobra** — el código postal cae en una zona con tarifa;
 * 2. **sale gratis** — cae en una zona que regala el envío a partir de cierto
 *    monto, y este pedido lo alcanzó;
 * 3. **no se entrega ahí** — el código postal no está en ninguna zona activa.
 *
 * El tercero **no** es «el envío cuesta cero». Es un sitio a donde la tienda no
 * llega, y decirlo antes de que alguien llene el carrito es más honesto que
 * descubrirlo al final.
 */
import type { DeliveryFeeReason } from '@/db/schema/sales';

export type ZoneForQuote = {
  id: string;
  name: string;
  feeCents: number;
  /** `null` = esta zona nunca regala el envío por monto. */
  freeOverCents: number | null;
};

export type DeliveryQuote =
  | {
      covered: true;
      zoneId: string;
      zoneName: string;
      feeCents: number;
      reason: Extract<DeliveryFeeReason, 'zone' | 'free_over_threshold'>;
      /** Cuánto falta de mercancía para que salga gratis. `null` si no aplica. */
      missingForFreeCents: number | null;
    }
  | { covered: false; reason: 'out_of_range' };

/** Lo que se cotiza para un pedido que se recoge en tienda: nada. */
export const NO_DELIVERY: {
  feeCents: 0;
  reason: Extract<DeliveryFeeReason, 'none'>;
} = { feeCents: 0, reason: 'none' };

/**
 * Cotiza el envío de un subtotal a una zona.
 *
 * `subtotalCents` es **mercancía**, nunca el total. Si se comparara el umbral
 * contra el total, el propio envío empujaría el pedido por encima del umbral y
 * el envío acabaría pagándose a sí mismo — un pedido de $780 más $50 de envío
 * cruzaría un umbral de $800 y el envío se volvería gratis, dejando el total en
 * $780. La regla se muerde la cola.
 */
export function quoteDelivery(
  zone: ZoneForQuote | null | undefined,
  subtotalCents: number,
): DeliveryQuote {
  if (!zone) return { covered: false, reason: 'out_of_range' };

  const qualifiesFree =
    zone.freeOverCents !== null && subtotalCents >= zone.freeOverCents;

  if (qualifiesFree) {
    return {
      covered: true,
      zoneId: zone.id,
      zoneName: zone.name,
      feeCents: 0,
      reason: 'free_over_threshold',
      missingForFreeCents: null,
    };
  }

  return {
    covered: true,
    zoneId: zone.id,
    zoneName: zone.name,
    feeCents: zone.feeCents,
    reason: 'zone',
    // Lo que le falta al carrito para cruzar el umbral. Es la cifra que hace
    // que alguien agregue otro producto, así que vale la pena calcularla aquí
    // y no dejársela a cada pantalla.
    missingForFreeCents:
      zone.freeOverCents !== null
        ? Math.max(0, zone.freeOverCents - subtotalCents)
        : null,
  };
}

/**
 * Aplica una exención decidida por una persona.
 *
 * Se aplica **después** de cotizar, nunca en lugar de cotizar: el pedido guarda
 * de qué zona era y qué se habría cobrado, y encima de eso que alguien decidió
 * no cobrarlo. Sustituir la cotización por un cero perdería la primera mitad de
 * esa frase, que es justo la que explica la decisión.
 *
 * Perdonar un envío que ya era gratis no es un error, pero tampoco es una
 * exención: se deja como estaba para que el motivo del pedido siga siendo el
 * verdadero.
 */
export function applyWaiver(
  quote: Extract<DeliveryQuote, { covered: true }>,
  note: string,
): {
  feeCents: number;
  reason: DeliveryFeeReason;
  note: string | null;
} {
  if (quote.feeCents === 0) {
    return { feeCents: 0, reason: quote.reason, note: null };
  }

  return { feeCents: 0, reason: 'waived', note };
}

/** Cómo se le explica la cotización a quien la lee. */
export function quoteLabel(quote: DeliveryQuote): string {
  if (!quote.covered) return 'No hacemos entregas en ese código postal.';

  if (quote.reason === 'free_over_threshold') {
    return `Envío gratis a ${quote.zoneName}.`;
  }

  return `Envío a ${quote.zoneName}.`;
}
