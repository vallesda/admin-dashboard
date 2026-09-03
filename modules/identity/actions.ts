'use server';

/**
 * IAM — Next.js adapter for authentication.
 *
 * Realiza: RF-IAM-001.
 *
 * Moved out of `app/lib/actions.ts`, which was the tutorial's catch-all for
 * invoice mutations. This was the only part of that file still alive.
 */
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { signIn } from '@/auth';
import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import { redirectWithFlash } from '@/lib/flash';
import { failed, ok, type ActionResult } from '@/lib/action-result';
import * as service from './service';
import {
  createAdminUserSchema,
  updateAdminUserSchema,
  resetPasswordSchema,
} from './validators';
import { clientIp } from '@/lib/client-ip';
import { hit } from '@/lib/rate-limit';
import type { AdminUserFormState } from './form-state';

/**
 * Diez intentos de entrada cada quince minutos por IP.
 *
 * El panel lo usan tres personas y entran una vez al día: diez intentos cubre
 * de sobra a quien se equivoca escribiendo, y deja un ataque de diccionario en
 * 960 pruebas al día — inservible contra cualquier contraseña que no esté ya en
 * una lista.
 *
 * Por IP y no por correo a propósito. Limitar por correo deja probar la misma
 * contraseña contra mil cuentas, que es como funciona el *credential stuffing*
 * de verdad; y además convierte el propio límite en un oráculo: «esta cuenta se
 * bloqueó, luego existe».
 */
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  /*
   * El freno va antes de `signIn`, que es lo que consulta la base y ejecuta
   * bcrypt. Sin esto, `/api/auth/*` —que queda fuera del matcher de `proxy.ts`—
   * se puede martillear sin coste para quien ataca y con coste para nosotros.
   */
  const ip = await clientIp();

  if (ip) {
    const { ok, retryAfter } = hit(`login:${ip}`, LOGIN_RATE_LIMIT);

    if (!ok) {
      const minutos = Math.ceil(retryAfter / 60);
      return `Demasiados intentos. Espera ${minutos} minuto${minutos === 1 ? '' : 's'} e inténtalo otra vez.`;
    }
  }

  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Correo o contraseña incorrectos.';
        default:
          return 'Algo salió mal. Inténtalo de nuevo.';
      }
    }
    // `redirect()` works by throwing; swallowing it here would break the
    // post-login navigation.
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Managing access
// ---------------------------------------------------------------------------

/**
 * Every action below requires `owner`.
 *
 * Granting access is the one power that can create more of itself, so it sits
 * with the role that already owns the shop rather than with `admin`. An admin
 * runs the catalogue; an owner decides who gets in.
 */
const USERS_PATH = '/dashboard/users';

function toFormState(error: unknown, fallback: string): AdminUserFormState {
  if (error instanceof AuthorizationError) {
    return { errors: {}, message: error.message };
  }
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

export async function createAdminUser(
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  const parsed = createAdminUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los campos. No se creó la cuenta.',
    };
  }

  try {
    await requireRole('owner');
    await service.createAdminUser(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo crear la cuenta.');
  }

  revalidatePath(USERS_PATH);
  redirectWithFlash(USERS_PATH, 'user.created');
}

export async function updateAdminUser(
  id: string,
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  const parsed = updateAdminUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    // An unchecked checkbox is absent from FormData entirely, which is the
    // difference between "false" and "missing".
    active: formData.get('active') === 'on',
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los campos. No se guardó la cuenta.',
    };
  }

  try {
    const session = await requireRole('owner');
    // The actor reaches the service so the lock-out guards can compare it
    // against the row being edited. A check that lived in the form would be no
    // check at all: a Server Action is a public POST endpoint.
    await service.updateAdminUser(id, parsed.data, session.user.id);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar la cuenta.');
  }

  revalidatePath(USERS_PATH);
  redirectWithFlash(USERS_PATH, 'user.updated');
}

export async function resetAdminUserPassword(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors.password?.[0];
    return failed(first ?? 'Revisa la contraseña.');
  }

  try {
    await requireRole('owner');
    await service.resetAdminUserPassword(id, parsed.data.password);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(USERS_PATH);
  return ok('Contraseña actualizada. La persona ya puede entrar con la nueva.');
}
