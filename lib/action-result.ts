/**
 * What a row-level server action reports back.
 *
 * The panel's write actions used to return `void`: archiving a product,
 * confirming an order and marking one paid all completed in silence, and the
 * only evidence was the row redrawing itself. This is the channel that turns
 * them into a confirmation.
 *
 * `idle` is the initial `useActionState` value and never renders anything — it
 * has to be distinguishable from "finished successfully with nothing to say",
 * or the first paint of every row action would announce a save nobody made.
 */
export type ActionResult =
  | { status: 'idle' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

export const IDLE_RESULT: ActionResult = { status: 'idle' };

export function ok(message: string): ActionResult {
  return { status: 'ok', message };
}

export function failed(message: string): ActionResult {
  return { status: 'error', message };
}
