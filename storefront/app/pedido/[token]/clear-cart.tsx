'use client';

import { useEffect } from 'react';

import { writeCart, EMPTY_CART } from '@/lib/cart';

const CLEARED_KEY = 'amoramar.cart.cleared-for';

/**
 * Empties the cart once the order actually exists.
 *
 * Clearing at submit time would lose a shopper's basket whenever the order
 * failed — out of stock, a network blip — which is exactly when they least
 * deserve to start over. So the cart survives until this page renders, which
 * only happens for a token the admin returned.
 *
 * The token is remembered so that reopening an old confirmation link later does
 * not wipe a cart that has since been refilled.
 */
export default function ClearCart({ token }: { token: string }) {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CLEARED_KEY) === token) return;
      window.localStorage.setItem(CLEARED_KEY, token);
    } catch {
      // Storage blocked: clearing the in-memory cart is still correct, we just
      // cannot remember that we did.
    }

    writeCart(EMPTY_CART);
  }, [token]);

  return null;
}
