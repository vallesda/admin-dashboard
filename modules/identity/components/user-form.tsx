'use client';

import { useActionState } from 'react';

import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import { createAdminUser, updateAdminUser } from '../actions';
import { emptyAdminUserFormState, type AdminUserFormState } from '../form-state';
import type { AdminUserListItem } from '../queries';
import { ROLE_DESCRIPTION } from './role-badge';

type Props = {
  /** Present when editing; absent when creating. */
  user?: AdminUserListItem;
  /** The signed-in owner, so the form can refuse to help them lock themselves out. */
  actorId: string;
};

const ROLES = ['staff', 'admin', 'owner'] as const;

/**
 * Create/edit form for an account with access to the panel.
 *
 * The password only appears on create. Changing someone else's password is a
 * different operation with a different consequence — it ends their session —
 * and burying it among "name" and "role" makes it too easy to reset a password
 * while meaning to fix a typo. Editing gets its own panel below the form.
 */
export default function UserForm({ user, actorId }: Props) {
  const isEdit = user !== undefined;
  const isSelf = isEdit && user.id === actorId;

  const action = isEdit ? updateAdminUser.bind(null, user.id) : createAdminUser;

  const [state, formAction, isPending] = useActionState<
    AdminUserFormState,
    FormData
  >(action, emptyAdminUserFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection title="Persona">
          <Field name="name" label="Nombre" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={user?.name}
                placeholder="María López"
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
              />
            )}
          </Field>

          <Field
            name="email"
            label="Correo"
            hint="Con este correo entra al panel."
            required
            error={state.errors?.email}
          >
            {(props) => (
              <input
                {...props}
                type="email"
                defaultValue={user?.email}
                placeholder="maria@amoramar.mx"
                required
                maxLength={255}
                autoComplete="off"
              />
            )}
          </Field>

          {!isEdit ? (
            <Field
              name="password"
              label="Contraseña temporal"
              hint="Mínimo 6 caracteres. Compártela por un medio seguro y pídele que la cambie."
              required
              error={state.errors?.password}
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
          ) : null}
        </FormSection>

        <FormSection
          title="Permisos"
          description="El rol decide qué puede hacer dentro del panel. El servidor lo verifica en cada acción, así que subir de rol es la única forma de dar más acceso."
        >
          <Field name="role" label="Rol" required error={state.errors?.role}>
            {(props) => (
              <select
                {...props}
                defaultValue={user?.role ?? 'staff'}
                required
                disabled={isSelf}
                className={`${props.className} max-w-xs`}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role === 'owner'
                      ? 'Owner'
                      : role === 'admin'
                        ? 'Admin'
                        : 'Staff'}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {/* The whole permission model in three lines, next to the control
              that sets it. An operator should not have to remember which role
              can register a payment. */}
          <ul className="flex flex-col gap-1.5 rounded-md border border-line bg-subtle px-3 py-2.5">
            {ROLES.map((role) => (
              <li key={role} className="text-xs text-ink-muted">
                <span className="font-medium text-ink">
                  {role === 'owner'
                    ? 'Owner'
                    : role === 'admin'
                      ? 'Admin'
                      : 'Staff'}
                </span>{' '}
                — {ROLE_DESCRIPTION[role]}
              </li>
            ))}
          </ul>
        </FormSection>

        {isEdit ? (
          <FormSection
            title="Acceso"
            description="Una cuenta desactivada deja de entrar en la siguiente petición, incluso si tiene la sesión abierta. No se borra: su nombre sigue firmando los movimientos de inventario que registró."
          >
            <div className="flex items-start gap-2.5">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={user.active}
                disabled={isSelf}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <label htmlFor="active" className="cursor-pointer text-sm text-ink">
                Puede entrar al panel
              </label>
            </div>
          </FormSection>
        ) : null}

        {/*
          Editing your own row: rol and acceso are disabled above, and a
          disabled control is not submitted at all — so the values are restated
          here as hidden inputs. Without them the action would read "no role"
          and "inactive" and lock the owner out through the very form meant to
          prevent it. The service refuses either change regardless; this is the
          UI telling the truth about it first.
        */}
        {isSelf ? (
          <>
            <input type="hidden" name="role" value={user.role} />
            <input type="hidden" name="active" value="on" />
            <p className="text-xs text-ink-muted">
              Es tu propia cuenta: no puedes bajarte de rol ni quitarte el
              acceso. Pídele a otro owner que lo haga.
            </p>
          </>
        ) : null}
      </FormCard>

      <FormActions
        cancelHref="/dashboard/users"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear cuenta'}
        isPending={isPending}
      />
    </form>
  );
}
