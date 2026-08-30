/**
 * Shape passed between the admin-user forms and their server actions.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
export type AdminUserFormState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    role?: string[];
    active?: string[];
  };
  message?: string | null;
};

export const emptyAdminUserFormState: AdminUserFormState = {
  errors: {},
  message: null,
};
