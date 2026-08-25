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
};

export const emptyStockFormState: StockFormState = {
  errors: {},
  message: null,
};
