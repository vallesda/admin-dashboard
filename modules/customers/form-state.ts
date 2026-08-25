/**
 * Shape passed between a Customer form and its server action.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
export type CustomerFormState = {
  errors?: {
    name?: string[];
    phone?: string[];
    email?: string[];
  };
  message?: string | null;
};

export const emptyCustomerFormState: CustomerFormState = {
  errors: {},
  message: null,
};
