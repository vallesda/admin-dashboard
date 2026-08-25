/**
 * Shape passed between a Category form and its server action.
 *
 * Lives outside `actions.ts` because a `'use server'` module may only export
 * async functions — exporting the constant from there fails the build with
 * "A 'use server' file can only export async functions, found object".
 */
export type CategoryFormState = {
  errors?: {
    name?: string[];
    slug?: string[];
    sortOrder?: string[];
    active?: string[];
  };
  message?: string | null;
};

export const emptyCategoryFormState: CategoryFormState = {
  errors: {},
  message: null,
};
