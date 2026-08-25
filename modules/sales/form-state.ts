/**
 * Shape passed between the order form and its server action.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
export type OrderFormState = {
  errors?: {
    customerId?: string[];
    fulfillmentType?: string[];
    deliveryAddress?: string[];
    deliveryFeeCents?: string[];
    notes?: string[];
    lines?: string[];
  };
  message?: string | null;
};

export const emptyOrderFormState: OrderFormState = {
  errors: {},
  message: null,
};
