import type { Cart } from './cart';
import type { Product } from './commerce/types';

/**
 * Picks what to suggest inside the cart.
 *
 * Pure and separate from the component so it can be exercised directly against
 * the real catalogue — the selection rule is the part with a decision in it,
 * and a rule that only runs inside a dialog is a rule nobody ever checks.
 *
 * The rule: never suggest what is already in the cart or out of stock, and
 * prefer a category the cart does not yet contain. Same-category suggestions
 * are substitutes — offering more tuna to someone buying tuna invites a swap,
 * not a bigger basket. They stay as a fallback so a single-category cart still
 * gets something rather than nothing.
 *
 * Order is stable: catalogue order within each group, no randomisation, so the
 * drawer does not reshuffle every time it opens.
 */
export function pickCrossSells(
  catalogue: Product[],
  cart: Cart,
  limit: number,
): Product[] {
  const inCart = new Set(cart.lines.map((l) => l.productId));

  const cartCategories = new Set(
    cart.lines
      .map((l) => catalogue.find((p) => p.id === l.productId)?.category)
      .filter((c): c is string => Boolean(c)),
  );

  const candidates = catalogue.filter(
    (p) => !inCart.has(p.id) && p.availableForSale,
  );

  const complementary = candidates.filter(
    (p) => !p.category || !cartCategories.has(p.category),
  );
  const substitutes = candidates.filter(
    (p) => p.category && cartCategories.has(p.category),
  );

  return [...complementary, ...substitutes].slice(0, limit);
}
