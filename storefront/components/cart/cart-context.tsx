'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  addLine,
  cartCount,
  cartSubtotalCents,
  getCartSnapshot,
  getCartServerSnapshot,
  removeLine,
  setLineQuantity,
  subscribeToCart,
  writeCart,
  type Cart,
} from '@/lib/cart';
import type { Product } from '@/lib/commerce/types';

/**
 * Global cart boundary.
 *
 * Mounted once in the root layout so a product page can open the drawer without
 * the layout knowing anything about products. State lives in `lib/cart`
 * (localStorage); this provider is the React view of it.
 *
 * Subscribed with `useSyncExternalStore` rather than an effect that calls
 * setState on mount: localStorage genuinely is an external store, and the hook
 * exists for exactly this. It also handles the SSR snapshot, so the first paint
 * matches the server — which has no cart — without a hydration mismatch.
 */
type CartContextValue = {
  cart: Cart;
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Adds a product, merging with an existing line for the same product. */
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  /** The quantity of one product in the cart, or 0 when it is not in it. */
  quantityOf: (productId: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Every write in `lib/cart` notifies this, so an Add to Cart button deep in
  // the tree updates the header without prop-drilling or a store library.
  const cart = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /*
   * All three mutations live here rather than in the components that trigger
   * them. `add` moved up from `AddToCart` when the catalogue cards started
   * needing it too: a second component reaching for `writeCart(addLine(...))`
   * directly is exactly how the cart drawer's suggestion row ended up with its
   * own subtly different copy of the write.
   */
  const add = useCallback((product: Product, quantity = 1) => {
    writeCart(addLine(getCartSnapshot(), product, quantity));
  }, []);

  // Writing is the only mutation path: `writeCart` updates the store and
  // notifies, and the hook re-renders whoever is subscribed.
  const setQuantity = useCallback((productId: string, quantity: number) => {
    writeCart(setLineQuantity(getCartSnapshot(), productId, quantity));
  }, []);

  const remove = useCallback((productId: string) => {
    writeCart(removeLine(getCartSnapshot(), productId));
  }, []);

  /*
   * Derived from `cart`, so it re-computes with the same snapshot every
   * subscriber already re-rendered on. A catalogue of eight cards each asking
   * "how many of me are in the cart?" is eight lookups over a list that is
   * never longer than the basket.
   */
  const quantityOf = useCallback(
    (productId: string) =>
      cart.lines.find((l) => l.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      count: cartCount(cart),
      subtotalCents: cartSubtotalCents(cart),
      isOpen,
      open,
      close,
      add,
      setQuantity,
      remove,
      quantityOf,
    }),
    [cart, isOpen, open, close, add, setQuantity, remove, quantityOf],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart requiere que CartProvider esté montado.');
  }

  return context;
}
