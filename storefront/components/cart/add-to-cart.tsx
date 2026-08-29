'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Product } from '@/lib/commerce/types';
import Button from '@/components/ui/button';
import { CheckIcon } from '@/components/product/icons';
import { useCart } from './cart-context';

/**
 * Add to cart — the one place the browser cart is written to.
 *
 * Writes to the browser cart store: no stock is reserved (RF-TDA-006), and no
 * price is trusted from here. The checkout recomputes the total from the
 * catalogue, so what this stores is display data.
 *
 * It serves the two placements where "add" is a one-shot act: the product page,
 * where the shopper has already chosen a quantity, and the suggestion row in the
 * cart drawer, where the suggestion disappears once taken. The catalogue card
 * uses `ProductCartControl` instead, because there the same slot has to keep
 * showing and adjusting the quantity afterwards.
 *
 * The write itself goes through the provider rather than touching the store
 * directly — one mutation surface for the whole cart.
 *
 * The confirmation is inline and brief rather than a toast, and adding never
 * opens the cart drawer. On the product page the shopper is looking at the
 * button they just pressed; in a grid they are mid-browse and may add three
 * things in a row, so a drawer that threw itself open each time would interrupt
 * the exact loop this feature exists to make fast. The header's cart count is
 * the persistent signal — it is subscribed to the same store and updates on
 * every write.
 */
export default function AddToCart({
  product,
  quantity = 1,
  variant = 'add',
  fullWidth = true,
  /** Short label for tight placements; the product name is appended for AT. */
  label = 'Agregar al carrito',
  /**
   * Where to send the shopper once the line is written. Used by the product
   * page, which returns them to the full catalogue; left unset everywhere the
   * shopper is already looking at a list.
   */
  redirectTo,
  className = '',
}: {
  product: Product;
  quantity?: number;
  variant?: 'add' | 'addOutline' | 'primary' | 'secondary';
  fullWidth?: boolean;
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  /*
   * The reset timer is cleared on unmount. A grid re-renders as the shopper
   * searches or changes collection, and a pending `setState` from a card that
   * no longer exists is a React warning at best and a leak at worst.
   */
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!product.availableForSale) {
    return (
      <Button
        variant={variant}
        fullWidth={fullWidth}
        disabled
        aria-disabled="true"
        className={className}
      >
        Agotado
        <span className="sr-only"> — {product.name}</span>
      </Button>
    );
  }

  function handleAdd() {
    add(product, quantity);

    /*
     * When the caller asks for it, the confirmation is the destination rather
     * than a label that flips for two seconds. The catalogue the shopper lands
     * on shows this product's own card already holding the quantity they just
     * chose — a more durable receipt than a check mark that expires.
     */
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }

    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <>
      <Button
        variant={variant}
        fullWidth={fullWidth}
        onClick={handleAdd}
        className={className}
      >
        {added ? (
          <>
            <CheckIcon />
            Agregado
          </>
        ) : (
          label
        )}
        {/*
          Eight buttons in a catalogue grid all named "Agregar" are eight
          identical entries in a screen reader's list of controls, with nothing
          to tell them apart. The product name is part of the accessible name,
          not just the visible label.
        */}
        <span className="sr-only"> — {product.name}</span>
      </Button>

      {/* Announced without stealing focus from the button. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {added ? `${quantity} × ${product.name} agregado al carrito.` : ''}
      </div>
    </>
  );
}
