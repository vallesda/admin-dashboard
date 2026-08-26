import { LOCALE, CURRENCY, type Money } from './commerce';

const formatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
});

/** Money arrives as integer centavos; the storefront formats, never computes. */
export function formatMoney(money: Money): string {
  return formatter.format(money.amountCents / 100);
}

const UNIT_LABEL: Record<string, string> = {
  piece: 'pieza',
  pack: 'paquete',
  kg: 'kg',
};

export function formatUnit(unit: string): string {
  return UNIT_LABEL[unit] ?? unit;
}
