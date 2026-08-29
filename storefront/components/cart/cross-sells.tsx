'use client';

import Image from 'next/image';

import type { Cart } from '@/lib/cart';
import type { Product } from '@/lib/commerce/types';
import { addLine, getCartSnapshot, writeCart } from '@/lib/cart';
import { pickCrossSells } from '@/lib/cross-sell';
import { formatMoney } from '@/lib/format';
import Eyebrow from '@/components/ui/eyebrow';

/**
 * Suggestions inside the cart.
 *
 * Deliberately NOT sourced from `/related`, which returns same-category
 * products. Same-category is a *substitute*: someone who already has tuna in
 * the cart is not helped by more tuna, and suggesting it mostly invites them to
 * swap rather than add.
 *
 * A true cross-sell is a complement — the lime, the sauce, the side. This
 * catalogue has none of those yet: it is seven products, all fish and seafood.
 * So the honest version is a variety pick — prefer categories the cart does not
 * already contain — under a label that promises no more than it delivers.
 *
 * Ordering is deterministic (catalogue order, stable partition). Randomising
 * would make the drawer reshuffle on every open for no gain.
 */
const LIMIT = 2;

export default function CrossSells({
  catalogue,
  cart,
}: {
  catalogue: Product[];
  cart: Cart;
}) {
  const suggestions = pickCrossSells(catalogue, cart, LIMIT);

  if (suggestions.length === 0) return null;

  return (
    <section
      aria-labelledby="cross-sells-heading"
      className="border-t border-border bg-sand/40 px-5 py-4"
    >
      <Eyebrow as="h3" id="cross-sells-heading" className="mb-3">
        Otros productos frescos
      </Eyebrow>

      <ul className="flex flex-col gap-3">
        {suggestions.map((product) => (
          <li key={product.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex-none overflow-hidden rounded-sm bg-sand">
              {product.featuredImage ? (
                <Image
                  src={product.featuredImage.url}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-sm plate"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="text-sm tabular-nums text-muted">
                {formatMoney(product.price)}
              </p>
            </div>

            {/* 44px tall like every other control in the drawer, and secondary
                to "Ir a confirmar" below it — a suggestion must never compete
                with the button that completes the order. */}
            <button
              type="button"
              onClick={() => writeCart(addLine(getCartSnapshot(), product, 1))}
              className="h-11 flex-none rounded border border-border-strong bg-surface px-4 text-sm transition-colors duration-150 hover:bg-background hover:text-brand"
            >
              Agregar
              <span className="sr-only"> {product.name} al carrito</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
