'use client';

import { MinusIcon, PlusIcon, TrashIcon } from '@/components/product/icons';

/**
 * Quantity control, shared by the product page and the cart.
 *
 * It was two components before, and they had drifted into two different
 * controls: the PDP shipped real −/+ buttons at 44px, while the cart shipped a
 * bare `<input type="number">` and left the browser to draw a 12px spinner
 * inside it. On a phone the cart's control was effectively unusable, and it was
 * the one a shopper reaches for last — while deciding whether to buy.
 *
 * The three parts are welded into a single bordered group rather than spaced
 * apart. A quantity is one value, and three floating boxes read as three
 * controls; the shared outline is what says "this is the number, and these are
 * its two directions". Interior dividers are hairlines so the group holds
 * together as one object.
 *
 * The buttons are 44×44 in every placement, with no compact variant. The system
 * has no exception to that size, and the cart is exactly where an exception
 * would be cashed in.
 *
 * `removable` changes what the minus button means at the bottom of its range. In
 * the cart and on the product page, one is the floor and the minus greys out. On
 * a catalogue card the control replaces an "Agregar" button, so the shopper has
 * to be able to get back out of it — there, one more press removes the line and
 * the card returns to offering "Agregar". The button swaps to a bin at that
 * point rather than staying a minus, because "−" on the last unit is a promise
 * to decrement, not to delete, and the two deserve different glyphs.
 *
 * `fullWidth` lets the group stretch to the width of the button it stands in for,
 * with the figure taking the slack. A card whose control changed width when it
 * gained a quantity would reflow its own row.
 */
export default function Stepper({
  value,
  max,
  onChange,
  id,
  /** Names the control for a screen reader when no visible label points at it. */
  label,
  /** Lets the minus button reach 0, removing the line instead of stopping at 1. */
  removable = false,
  fullWidth = false,
  className = '',
}: {
  value: number;
  /** Stock ceiling. The control never lets a shopper build a rejected order. */
  max: number;
  onChange: (next: number) => void;
  id?: string;
  label?: string;
  removable?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const ceiling = max > 0 ? max : 1;
  const removing = removable && value <= 1;
  const canDecrease = removable || value > 1;
  const canIncrease = value < ceiling;

  const button =
    'flex h-11 w-11 flex-none items-center justify-center text-foreground transition-colors duration-150 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div
      className={`${
        fullWidth ? 'flex w-full' : 'inline-flex'
      } items-stretch rounded border border-border-strong bg-surface ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={
          removing
            ? label
              ? `Quitar ${label} del carrito`
              : 'Quitar del carrito'
            : label
              ? `Quitar uno de ${label}`
              : 'Quitar uno'
        }
        className={`${button} rounded-l ${
          removing ? 'hover:bg-brand-soft hover:text-brand' : ''
        }`}
      >
        {removing ? <TrashIcon /> : <MinusIcon />}
      </button>

      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={ceiling}
        value={value}
        aria-label={label ? `Cantidad de ${label}` : undefined}
        onChange={(e) => {
          const next = Number(e.target.value);
          // A cleared field reports NaN mid-edit; holding the last good value
          // is better than snapping to 1 while the shopper is still typing.
          if (!Number.isFinite(next)) return;
          onChange(Math.min(Math.max(1, Math.floor(next)), ceiling));
        }}
        // The hairlines are the group's interior structure, so the field itself
        // carries no border of its own — two borders meeting would read as 2px.
        className={`h-11 border-x border-border-strong bg-surface text-center text-sm tabular-nums focus-visible:relative ${
          fullWidth ? 'w-full min-w-0 flex-1' : 'w-12'
        }`}
      />

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={label ? `Agregar uno de ${label}` : 'Agregar uno'}
        className={`${button} rounded-r`}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
