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
