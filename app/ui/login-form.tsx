'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

import { authenticate } from '@/modules/identity/actions';
import Field from '@/app/ui/kit/field';

/**
 * Sign in.
 *
 * The decorated inputs are gone for the same reason they went from every other
 * form — an at-sign icon inside a field labelled "Correo" repeats the label in
 * pictures — and so is the reserved `h-8` error strip, which held eight pixels
 * of empty space under the button on every successful load.
 *
 * The error carries `role="alert"`. A failed sign-in previously rendered red
 * text a screen reader was never told about, so the whole failure was silent for
 * anyone not looking at that corner of the screen.
 */
export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field name="email" label="Correo" required>
        {(props) => (
          <input
            {...props}
            type="email"
            placeholder="tu@correo.mx"
            autoComplete="email"
            required
          />
        )}
      </Field>

      <Field name="password" label="Contraseña" required>
        {(props) => (
          <input
            {...props}
            type="password"
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
            minLength={6}
          />
        )}
      </Field>

      <input type="hidden" name="redirectTo" value={callbackUrl} />

      <button
        type="submit"
        disabled={isPending}
        className="mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-500 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>

      {errorMessage ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          <ExclamationCircleIcon
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
