'use client';

import type { Product } from '@/lib/commerce/types';
import Button from '@/components/ui/button';
import Stepper from '@/components/ui/stepper';
import { useCart } from './cart-context';

/**
 * The catalogue card's purchase control.
 *
 * One slot with two states, driven by the cart itself rather than by local
 * state: when the product is not in the basket it offers "Agregar", and the
 * moment it is, it becomes that line's quantity — minus, figure, plus — so the
 * shopper can build the whole order without ever opening the drawer. That is
 * the weekly-pantry shopper's entire job, and it used to cost them a round trip
 * to the cart for every adjustment.
 *
 * ## Why the cart is the source of truth
 *
 * The quantity is read from the store on every render, never mirrored into
 * component state. The same product can appear twice on one screen — in the
 * grid and in the week's-catch band, or in the grid and the drawer behind it —
 * and a card holding its own copy of the number would show a stale one the
 * moment the shopper edited the other. It also means an edit made in the drawer
 * is reflected on the card underneath immediately, and that a cart restored
 * from `localStorage` on a second visit renders its quantities without a
 * reconciliation pass.
 *
 * ## Why there is no "Agregado" confirmation any more
 *
 * There was a two-second inline check on the old button. It is gone because the
 * control now *becomes* the evidence: the stepper appearing with a 1 in it says
 * everything the check said, permanently, and without a timer that fires after
 * the card has already been re-rendered by a search.
 *
 * ## Why the height never changes
 *
 * Both states are 44px and full width. A card that grew or shrank when its
 * quantity changed would shift every card below it in the grid — the shopper
 * would press "+" and watch the page move under their finger.
 */
export default function ProductCartControl({
  product,
  className = '',
}: {
  product: Product;
  className?: string;
}) {
  const { add, setQuantity, quantityOf } = useCart();
  const quantity = quantityOf(product.id);

  if (!product.availableForSale) {
    return (
      <Button
        variant="secondary"
        fullWidth
        disabled
        aria-disabled="true"
        className={className}
      >
        Agotado
        <span className="sr-only"> — {product.name}</span>
      </Button>
    );
  }

  if (quantity === 0) {
    return (
      <>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => add(product, 1)}
          className={className}
        >
          Agregar
          {/*
            Eight buttons in a catalogue grid all named "Agregar" are eight
            identical entries in a screen reader's list of controls, with
            nothing to tell them apart.
          */}
          <span className="sr-only"> — {product.name}</span>
        </Button>

        {/*
          The region is rendered in both states so assistive tech has something
          continuous to watch. It is empty here: the announcement belongs to the
          quantity below, and repeating "0" on every card would be noise.
        */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" />
      </>
    );
  }

  return (
    <>
      <Stepper
        value={quantity}
        // The stock ceiling, so the grid cannot build a cart the checkout will
        // reject when it reserves under a row lock.
        max={product.available}
        // One more press below 1 removes the line and returns this slot to
        // "Agregar". Without it the shopper can add from the grid but has to go
        // to the drawer to undo it, which is a one-way door on the busiest
        // screen in the shop.
        removable
        fullWidth
        label={product.name}
        onChange={(next) => setQuantity(product.id, next)}
        className={className}
      />

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {quantity} × {product.name} en el carrito.
      </div>
    </>
  );
}
