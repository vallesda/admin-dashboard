/**
 * Shape of the checkout form's result.
 *
 * Deliberately NOT in actions.ts: a "use server" module may only export async
 * functions, so exporting a plain object from there throws at module evaluation
 * -- "A 'use server' file can only export async functions, found object". Same
 * split the admin already uses in its modules' form-state files.
 */
export type CheckoutState = {
  /** A failure the shopper cannot fix by editing a field. */
  error: string | null;
  /** Keyed by input name, so each field renders its own message. */
  fieldErrors: Record<string, string>;
};

export const EMPTY_STATE: CheckoutState = { error: null, fieldErrors: {} };
