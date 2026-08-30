/**
 * IAM — input validation.
 */
import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z
    .string({ invalid_type_error: 'Escribe tu correo.' })
    .trim()
    .toLowerCase()
    .email({ message: 'Escribe un correo válido.' }),
  password: z
    .string({ invalid_type_error: 'Escribe tu contraseña.' })
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

const name = z
  .string({ invalid_type_error: 'Escribe un nombre.' })
  .trim()
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  .max(255, { message: 'El nombre no puede pasar de 255 caracteres.' });

const email = z
  .string({ invalid_type_error: 'Escribe un correo.' })
  .trim()
  .toLowerCase()
  .email({ message: 'Escribe un correo válido.' })
  .max(255);

/**
 * Six characters, matching the sign-in schema.
 *
 * Deliberately not stricter than what the login accepts: a rule the create form
 * enforces and the login does not would let someone set a password they can
 * then never be asked for correctly.
 */
const password = z
  .string({ invalid_type_error: 'Escribe una contraseña.' })
  .min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  .max(200, { message: 'La contraseña no puede pasar de 200 caracteres.' });

const role = z.enum(['staff', 'admin', 'owner'], {
  errorMap: () => ({ message: 'Elige un rol válido.' }),
});

export const createAdminUserSchema = z.object({
  name,
  email,
  password,
  role,
});

/** Password is changed on its own, never as a side effect of editing a name. */
export const updateAdminUserSchema = z.object({
  name,
  email,
  role,
  active: z.coerce.boolean(),
});

export const resetPasswordSchema = z.object({ password });

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
