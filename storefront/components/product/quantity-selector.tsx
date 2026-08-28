'use client';

import { MinusIcon, PlusIcon } from './icons';

/**
 * Quantity control.
 *
 * Big touch targets: this sits right above Add to Cart on a phone, and a
 * mis-tap there costs a sale. Capped at what is actually in stock so the
 * shopper cannot build a cart the checkout will reject.
 */
export default function QuantitySelector({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const canDecrease = value > 1;
  const canIncrease = max > 0 && value < max;

  return (
    <div>
      <label
        htmlFor="quantity"
        className="mb-2 block text-sm font-medium"
      >
        Cantidad
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={!canDecrease}
          aria-label="Quitar uno"
          className="flex h-11 w-11 items-center justify-center rounded border border-border-strong bg-surface transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MinusIcon />
        </button>

        <input
          id="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={max || 1}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next)) return;
            onChange(Math.min(Math.max(1, Math.floor(next)), max || 1));
          }}
          className="h-11 w-16 rounded border border-border-strong bg-surface text-center text-sm tabular-nums"
        />

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={!canIncrease}
          aria-label="Agregar uno"
          className="flex h-11 w-11 items-center justify-center rounded border border-border-strong bg-surface transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon />
        </button>

        {max > 0 && max <= 5 ? (
          <span className="ml-2 text-sm text-muted">
            Quedan {max}
          </span>
        ) : null}
      </div>
    </div>
  );
}
