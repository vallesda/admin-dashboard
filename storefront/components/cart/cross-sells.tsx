'use client';

import Image from 'next/image';

import type { Cart } from '@/lib/cart';
import type { Product } from '@/lib/commerce/types';
import { pickCrossSells } from '@/lib/cross-sell';
import { formatMoney } from '@/lib/format';
import Eyebrow from '@/components/ui/eyebrow';
import AddToCart from './add-to-cart';

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

            {/* The shared control, not a local copy of the write.
                Secondary and not full width, so a suggestion never competes
                with "Ir a confirmar" below it — and it now confirms the add and
                announces it, which the hand-rolled button did neither of. */}
            <div className="flex-none">
              <AddToCart
                product={product}
                variant="secondary"
                fullWidth={false}
                label="Agregar"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
