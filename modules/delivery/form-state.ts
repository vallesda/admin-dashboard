/**
 * Shape passed between the zone form and its server action.
 *
 * Outside `actions.ts` because a `'use server'` module may only export async
 * functions.
 */
export type ZoneFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string | null;
};

export const emptyZoneFormState: ZoneFormState = { errors: {}, message: null };
