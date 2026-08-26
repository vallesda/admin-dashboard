/**
 * Cart store.
 *
 * The cart lives in the browser, never on the server: `RF-TDA-006` says adding
 * to the cart must not reserve stock, and a server-side cart would invite
 * exactly that. Stock is reserved once, at checkout.
 *
 * Only ids and quantities are ever sent to the API. The prices kept here are
 * for display; the authoritative total is computed server-side from the
 * catalogue (RN-008), so a tampered localStorage cannot change what is charged.
 *
 * This module is the storage layer. The provider and drawer are built on top of
 * it and share this same key, so nothing here is throwaway.
 */
import type { CartLine, Product } from './commerce/types';

const STORAGE_KEY = 'amoramar.cart.v1';

export type Cart = {
  lines: CartLine[];
};

export const EMPTY_CART: Cart = { lines: [] };

/**
 * Reads the cart.
 *
 * Every access is wrapped: `localStorage` throws outright in some contexts
 * (private windows, blocked site data), and a shopper with cookies disabled
 * should see an empty cart, not a crashed page.
 */
export function readCart(): Cart {
  if (typeof window === 'undefined') return EMPTY_CART;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;

    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.lines)) return EMPTY_CART;

    return parsed;
  } catch {
    return EMPTY_CART;
  }
}

export function writeCart(cart: Cart): void {
  if (typeof window === 'undefined') return;

  snapshot = cart;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage unavailable (private window, blocked site data). The cart still
    // works for this page view; it just will not survive a reload.
  }

  // Notifies subscribers whether or not the write itself succeeded.
  window.dispatchEvent(new Event(CART_EVENT));
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

export const CART_EVENT = 'amoramar:cart';

/**
 * Cached snapshot.
 *
 * `useSyncExternalStore` compares snapshots by reference and re-renders when
 * they differ, so `getSnapshot` must return the *same* object until something
 * actually changes. Parsing localStorage on every call would return a new
 * object each time and spin forever.
 */
let snapshot: Cart | null = null;

export function subscribeToCart(onChange: () => void): () => void {
  const onStorage = () => {
    // Another tab is the same shopper; drop the cache and re-read.
    snapshot = null;
    onChange();
  };

  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function getCartSnapshot(): Cart {
  if (snapshot === null) snapshot = readCart();
  return snapshot;
}

/** The server has no cart, so the first paint must match an empty one. */
export function getCartServerSnapshot(): Cart {
  return EMPTY_CART;
}

/** Adds a line, merging with an existing one for the same product. */
export function addLine(
  cart: Cart,
  product: Product,
  quantity: number,
): Cart {
  const existing = cart.lines.find((l) => l.productId === product.id);

  if (existing) {
    return {
      lines: cart.lines.map((l) =>
        l.productId === product.id
          ? { ...l, quantity: l.quantity + quantity }
          : l,
      ),
    };
  }

  const line: CartLine = {
    productId: product.id,
    handle: product.handle,
    name: product.name,
    unitPrice: product.price,
    quantity,
    image: product.featuredImage,
  };

  return { lines: [...cart.lines, line] };
}

export function setLineQuantity(
  cart: Cart,
  productId: string,
  quantity: number,
): Cart {
  if (quantity <= 0) return removeLine(cart, productId);

  return {
    lines: cart.lines.map((l) =>
      l.productId === productId ? { ...l, quantity } : l,
    ),
  };
}

export function removeLine(cart: Cart, productId: string): Cart {
  return { lines: cart.lines.filter((l) => l.productId !== productId) };
}

export function cartCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}

/** Display subtotal. The order total is recomputed server-side at checkout. */
export function cartSubtotalCents(cart: Cart): number {
  return cart.lines.reduce(
    (sum, l) => sum + l.unitPrice.amountCents * l.quantity,
    0,
  );
}
