/**
 * Shape passed between an inventory form and its server action.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
export type StockFormState = {
  errors?: {
    quantity?: string[];
    note?: string[];
    lowStockThreshold?: string[];
  };
  message?: string | null;
  /**
   * Set only on a successful write, and only by the action.
   *
   * These three forms stay on the page after saving — an operator receiving a
   * delivery does several in a row — so there is no redirect to hang a `?flash=`
   * code on. The form reads this and raises the toast itself.
   */
  done?: string | null;
};

export const emptyStockFormState: StockFormState = {
  errors: {},
  message: null,
  done: null,
};
