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

import { signIn } from '@/auth';

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
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
