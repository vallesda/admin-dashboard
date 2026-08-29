import { formatMoney, formatUnit } from '@/lib/format';
import type { Money } from '@/lib/commerce/types';

/**
 * Price display.
 *
 * `tabular-nums` so digits line up down a product grid — prices that jitter
 * column to column are harder to compare, and comparison is the whole job of a
 * collection page.
 *
 * The unit is sized in `em`, so it stays proportional wherever the price is
 * set. On the product page the price is `text-3xl`, and a unit inheriting that
 * put "/ paquete" at 30px — the same weight as the number it qualifies, which
 * made a $620 price read as a two-part headline. See `.price-unit`.
 *
 * The unit needs a tone, because this component renders on two surfaces. Sea
 * Grey is the secondary text colour on cream and it is chosen to clear 4.5:1
 * there — but on the brand green of the week's-catch band the same value
 * measures about 1.3:1, and "/ kg" was effectively invisible on the one section
 * of the homepage that shows a single price. Secondary text on a coloured
 * surface is tinted from that surface's own foreground, never left grey.
 */
export default function Price({
  value,
  unit,
  tone = 'default',
  className = '',
}: {
  value: Money;
  unit?: string;
  /** `on-brand` for green surfaces. */
  tone?: 'default' | 'on-brand';
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatMoney(value)}
      {unit ? (
        <span
          className={`price-unit ${
            tone === 'on-brand' ? 'text-background/70' : 'text-muted'
          }`}
        >
          {' '}
          / {formatUnit(unit)}
        </span>
      ) : null}
    </span>
  );
}
