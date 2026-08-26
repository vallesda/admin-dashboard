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
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
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

  // Writing is the only mutation path: `writeCart` updates the store and
  // notifies, and the hook re-renders whoever is subscribed.
  const setQuantity = useCallback((productId: string, quantity: number) => {
    writeCart(setLineQuantity(getCartSnapshot(), productId, quantity));
  }, []);

  const remove = useCallback((productId: string) => {
    writeCart(removeLine(getCartSnapshot(), productId));
  }, []);

  const value = useMemo(
    () => ({
      cart,
      count: cartCount(cart),
      subtotalCents: cartSubtotalCents(cart),
      isOpen,
      open,
      close,
      setQuantity,
      remove,
    }),
    [cart, isOpen, open, close, setQuantity, remove],
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
