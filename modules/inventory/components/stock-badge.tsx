import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import Badge from '@/app/ui/kit/badge';

/**
 * Available units, flagged when at or below the threshold.
 *
 * The warning is an icon plus the word "bajo", never colour alone.
 *
 * A healthy stock level is deliberately *not* a badge. It used to render as a
 * grey chip, which put a coloured pill on every row of the inventory table and
 * made the handful that were actually low no easier to find — the ink cost as
 * much attention as the signal. A normal figure is now just a figure, and the
 * badge appears only when there is something to say.
 */
export default function StockBadge({
  available,
  isLowStock,
}: {
  available: number;
  isLowStock: boolean;
}) {
  if (!isLowStock) {
    return <span className="tabular-nums text-ink">{available}</span>;
  }

  return (
    <Badge tone="warn" icon={ExclamationTriangleIcon}>
      <span className="tabular-nums">{available}</span> bajo
    </Badge>
  );
}
