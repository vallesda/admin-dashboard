'use client';

import { useState } from 'react';

import type { Product } from '@/lib/commerce/types';
import { addLine, readCart, writeCart } from '@/lib/cart';
import Button from '@/components/ui/button';
import { CheckIcon } from '@/components/product/icons';

/**
 * Add to cart.
 *
 * Writes to the browser cart store — no stock is reserved (RF-TDA-006), and no
 * price is trusted from here: the checkout recomputes the total from the
 * catalogue, so what this stores is display data.
 *
 * The confirmation is inline and brief rather than a toast: at this point in the
 * page the shopper is looking at the button they just pressed.
 */
export default function AddToCart({
  product,
  quantity,
}: {
  product: Product;
  quantity: number;
}) {
  const [added, setAdded] = useState(false);

  if (!product.availableForSale) {
    return (
      <Button fullWidth disabled aria-disabled="true">
        Agotado
      </Button>
    );
  }

  function handleAdd() {
    writeCart(addLine(readCart(), product, quantity));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div>
      <Button fullWidth onClick={handleAdd}>
        {added ? (
          <>
            <CheckIcon />
            Agregado
          </>
        ) : (
          'Agregar al carrito'
        )}
      </Button>

      {/* Announced without stealing focus from the button. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {added ? `${quantity} × ${product.name} agregado al carrito.` : ''}
      </div>
    </div>
  );
}
