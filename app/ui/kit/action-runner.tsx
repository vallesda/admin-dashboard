'use client';

import { useTransition } from 'react';

import type { ActionResult } from '@/lib/action-result';
import { useToast } from './toast';

/**
 * Runs a bound server action and turns its result into a toast.
 *
 * ## Why this is not `useActionState`
 *
 * It was, and it did not work. These buttons change the very state that decides
 * whether they exist: archiving a product replaces the "Archivar" button with
 * "Volver a borrador", confirming an order swaps the whole transition set. The
 * component holding the action state **unmounts as part of its own success**,
 * taking the result with it before any effect could read it. The confirmation
 * was silently lost exactly on the actions that most needed one.
 *
 * So the action is invoked imperatively instead, and the result is handed to
 * `notify` — which belongs to `ToastProvider` up in the dashboard layout. That
 * provider is still mounted when the promise settles, so the announcement lands
 * even though the button that started it is already gone.
 *
 * ## Cost, stated plainly
 *
 * A `<form action={…}>` would still submit with JavaScript disabled; a click
 * handler will not. This is an authenticated internal panel that already
 * requires JavaScript for its search, its filters and its quantity controls, so
 * the trade buys reliable confirmations for a capability nothing here had.
 *
 * ## Failures
 *
 * The actions convert their expected refusals — a domain rule, an insufficient
 * role — into an `error` result, which surfaces as a red toast that does not
 * auto-dismiss. Anything that still throws is a genuine bug: it is logged and
 * announced rather than left to blank the screen, because an operator halfway
 * through an order queue is worse served by an error page than by a red message
 * and an intact table.
 */
export default function ActionRunner({
  action,
  children,
}: {
  /** A server action with its arguments already bound. */
  action: () => Promise<ActionResult>;
  children: (pending: boolean, run: () => void) => React.ReactNode;
}) {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.status === 'idle') return;
        notify({
          tone: result.status === 'ok' ? 'ok' : 'error',
          message: result.message,
        });
      } catch (error) {
        console.error(error);
        notify({
          tone: 'error',
          message: 'No se pudo completar la acción. Vuelve a intentarlo.',
        });
      }
    });
  }

  return <>{children(pending, run)}</>;
}
