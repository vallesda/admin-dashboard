'use client';

import { useCart } from './cart-context';

/**
 * Cart trigger in the header.
 *
 * The count is announced as part of the button's accessible name, so a screen
 * reader user hears "Carrito, 3 artículos" rather than "button" and a badge
 * they cannot see.
 */
export default function OpenCart() {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      className="relative flex h-11 items-center gap-2 rounded-sm px-3 text-sm transition-colors duration-150 hover:bg-sand"
    >
      <BagIcon />
      <span className="hidden sm:inline">Carrito</span>
      {count > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs tabular-nums text-background">
          {count}
        </span>
      ) : null}
      <span className="sr-only">
        {count === 0
          ? 'Carrito vacío'
          : `${count} ${count === 1 ? 'artículo' : 'artículos'} en el carrito`}
      </span>
    </button>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 6h10l-.8 9.2a1.5 1.5 0 01-1.5 1.3H7.3a1.5 1.5 0 01-1.5-1.3L5 6zM7.5 6V4.75a2.5 2.5 0 015 0V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
