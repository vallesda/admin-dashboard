import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * Available units, flagged when at or below the threshold.
 *
 * The warning is an icon plus the word "bajo", never colour alone.
 */
export default function StockBadge({
  available,
  isLowStock,
}: {
  available: number;
  isLowStock: boolean;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs tabular-nums',
        isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600',
      )}
    >
      {available}
      {isLowStock ? (
        <>
          <ExclamationTriangleIcon className="w-4 text-amber-800" />
          bajo
        </>
      ) : null}
    </span>
  );
}
