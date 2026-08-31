import { LOCALE, CURRENCY } from './commerce/constants';
import type { Money, Product } from './commerce/types';

const formatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
});

/** Money arrives as integer centavos; the storefront formats, never computes. */
export function formatMoney(money: Money): string {
  return formatter.format(money.amountCents / 100);
}

/**
 * `Record<Unit, …>` y no `Record<string, …>`.
 *
 * Con la firma laxa, añadir un valor al enum de unidades compilaba sin decir
 * nada y el precio salía con la clave cruda —«/ dozen»— hasta que alguien lo
 * viera. Tipado contra la unión, el enum no puede crecer sin que aquí falle la
 * compilación, que es donde hay que decidir cómo se llama en español.
 *
 * El `?? unit` se queda como red: la unidad llega por la API y un servidor más
 * nuevo que este cliente puede mandar una que todavía no conoce. Mejor
 * enseñarla cruda que dejar el precio sin unidad.
 */
const UNIT_LABEL: Record<Product['unit'], string> = {
  piece: 'pieza',
  pack: 'paquete',
  kg: 'kg',
  dozen: 'docena',
};

export function formatUnit(unit: string): string {
  return UNIT_LABEL[unit as Product['unit']] ?? unit;
}
