'use client';

import { FREE_SHIPPING_THRESHOLD_CENTS, CURRENCY } from '@/lib/commerce/constants';
import { formatMoney } from '@/lib/format';

/**
 * Progress towards free delivery.
 *
 * Renders nothing while `FREE_SHIPPING_THRESHOLD_CENTS` is null, which is the
 * case today: delivery pricing is not modelled in the backend yet, so there is
 * no threshold to promise. Inventing one here would be a business commitment
 * made up by the storefront — the shop would owe free delivery on a number
 * nobody agreed to.
 *
 * The wiring exists so that setting the constant is the only change needed.
 */
export default function ShippingProgress({
  subtotalCents,
}: {
  subtotalCents: number;
}) {
  const threshold = FREE_SHIPPING_THRESHOLD_CENTS;

  if (threshold === null || threshold <= 0) return null;

  const remaining = Math.max(0, threshold - subtotalCents);
  const reached = remaining === 0;
  const pct = Math.min(100, Math.round((subtotalCents / threshold) * 100));

  return (
    <div className="mb-4">
      <p className="mb-2 text-sm text-muted">
        {reached ? (
          <span className="text-foreground">Tu envío es gratis.</span>
        ) : (
          <>
            Te faltan{' '}
            <span className="tabular-nums text-foreground">
              {formatMoney({ amountCents: remaining, currency: CURRENCY })}
            </span>{' '}
            para el envío gratis.
          </>
        )}
      </p>
      {/* The bar is decorative: the sentence above already carries the state,
          so a screen reader is not read a progress percentage twice. */}
      <div
        aria-hidden="true"
        className="h-1 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
