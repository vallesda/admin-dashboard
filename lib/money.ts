/**
 * Money handling.
 *
 * RN-002: prices are stored and computed as integer centavos. Never `float`.
 * MVP currency is MXN only, so there is no currency column yet (DOCS
 * MODELO-DATOS.md §1) and no currency argument here.
 *
 * This is the replacement for `app/lib/utils.ts:formatCurrency`, which is
 * hardcoded to en-US/USD (DT-008) and belongs to the tutorial code.
 */

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

/** 34900 → "$349.00" */
export function formatCentavos(centavos: number): string {
  return MXN.format(centavos / 100);
}

/**
 * Parses a peso amount typed by a human into integer centavos.
 *
 * Accepts "349", "349.5", "349.50", "$349.50" and "1,349.50". Returns null when
 * the input is not a usable amount, so the caller decides the message.
 *
 * Rounds rather than truncates: `34.99 * 100` is `3498.9999999999995` in
 * floating point, and truncating would silently charge a centavo less.
 */
export function parsePesosToCentavos(input: string | number): number | null {
  const raw = typeof input === 'number' ? String(input) : input;

  const cleaned = raw.trim().replace(/[$\s,]/g, '');
  if (cleaned === '') return null;

  // Reject anything that is not a plain decimal: "1.2.3", "12e5", "abc".
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;

  const pesos = Number(cleaned);
  if (!Number.isFinite(pesos)) return null;

  return Math.round(pesos * 100);
}

/** 34900 → "349.00", for prefilling a number input in an edit form. */
export function centavosToPesosInput(centavos: number): string {
  return (centavos / 100).toFixed(2);
}
