'use client';

import { useRouter } from 'next/navigation';

import type { Bundle } from '@/lib/commerce/types';
import Button from '@/components/ui/button';
import { useCart } from './cart-context';

/**
 * Puts every line of a package into the cart in one press.
 *
 * This is the whole point of a package: "todo lo necesario para una receta"
 * means the shopper should not have to add six things one at a time and hope
 * they got the quantities right.
 *
 * ## Merging, not replacing
 *
 * Each line goes through the provider's `add`, which merges with an existing
 * line for the same product rather than overwriting it. Someone who already had
 * one piece of tuna and then adds a package containing two ends up with three —
 * which is what they asked for. Replacing would silently discard a choice they
 * made earlier.
 *
 * ## Why it redirects to the cart
 *
 * Adding six lines at once has no single control that can show the result, and
 * the catalogue card trick — the stepper appearing with the new quantity — does
 * not work when the products are spread across the catalogue. So the drawer
 * opens: it is the only surface that can show all six lines and the new total
 * together, which is exactly what a shopper needs to check after a bulk add.
 */
export default function AddPackage({ bundle }: { bundle: Bundle }) {
  const { add, open } = useCart();
  const router = useRouter();

  if (!bundle.availableForSale) {
    return (
      <Button variant="addOutline" fullWidth disabled aria-disabled="true">
        Incompleto por hoy
      </Button>
    );
  }

  function handleAdd() {
    for (const line of bundle.lines) {
      add(line.product, line.quantity);
    }
    // The catalogue behind the drawer should reflect the new quantities when the
    // shopper closes it, so the route is refreshed rather than left stale.
    router.refresh();
    open();
  }

  return (
    <>
      <Button variant="add" fullWidth onClick={handleAdd}>
        Agregar el paquete al carrito
      </Button>

      <div aria-live="polite" aria-atomic="true" className="sr-only" />
    </>
  );
}
