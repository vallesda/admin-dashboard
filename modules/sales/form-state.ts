/**
 * Shape passed between the order form and its server action.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
/**
 * Keyed by input name, including the delivery address's own fields.
 *
 * Open-ended rather than a closed list of keys: the address contributes eight
 * of them and `actions.ts` lifts nested Zod paths to their last segment, so the
 * shape here follows the form rather than a hand-maintained union that would
 * drift the first time a field is added.
 */
export type OrderFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string | null;
};

export const emptyOrderFormState: OrderFormState = {
  errors: {},
  message: null,
};
