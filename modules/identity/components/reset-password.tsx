'use client';

import { useActionState } from 'react';

import Field from '@/app/ui/kit/field';
import { IDLE_RESULT, type ActionResult } from '@/lib/action-result';
import { resetAdminUserPassword } from '../actions';

/**
 * Set a new password for someone else.
 *
 * Kept apart from the edit form because the consequence is different: the
 * person is locked out of their current session until they are told the new
 * password. Mixing it into "Guardar cambios" makes that a side effect of fixing
 * a misspelled name.
 *
 * The outcome is announced inline rather than through a redirect toast — this
 * form does not navigate, and the operator needs to still be looking at the
 * password they just typed when they read that it worked.
 */
export default function ResetPassword({ id, name }: { id: string; name: string }) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    resetAdminUserPassword.bind(null, id),
    IDLE_RESULT,
  );

  return (
    <form
      action={formAction}
      className="flex max-w-3xl flex-col gap-4 rounded-lg border border-line bg-surface p-4 md:p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Restablecer contraseña</h2>
        <p className="mt-0.5 max-w-[70ch] text-xs text-ink-muted">
          Al guardarla, {name} deja de poder entrar con la anterior. Compártesela
          por un medio seguro.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field
          name="password"
          label="Nueva contraseña"
          error={state.status === 'error' ? state.message : undefined}
          className="min-w-64 flex-1"
        >
          {(props) => (
            <input
              {...props}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          )}
        </Field>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Guardando…' : 'Restablecer'}
        </button>
      </div>

      {state.status === 'ok' ? (
        <p role="status" className="text-xs font-medium text-ok">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
