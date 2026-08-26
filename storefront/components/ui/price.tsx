import { formatMoney, formatUnit } from '@/lib/format';
import type { Money } from '@/lib/commerce/types';

/**
 * Price display.
 *
 * `tabular-nums` so digits line up down a product grid — prices that jitter
 * column to column are harder to compare, and comparison is the whole job of a
 * collection page.
 */
export default function Price({
  value,
  unit,
  className = '',
}: {
  value: Money;
  unit?: string;
  className?: string;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatMoney(value)}
      {unit ? (
        <span className="text-muted"> / {formatUnit(unit)}</span>
      ) : null}
    </span>
  );
}
