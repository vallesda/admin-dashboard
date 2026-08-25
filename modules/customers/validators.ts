/**
 * CLI — input validation.
 */
import { z } from 'zod';

/**
 * Mexican phone input, kept forgiving on purpose.
 *
 * Staff take orders by phone and type what the customer says: "55 1234 5678",
 * "(55) 1234-5678", "+52 55 1234 5678". Rejecting formatting would make the
 * form fight the person using it, so we require 10 to 15 digits and keep
 * whatever they typed.
 */
const phone = z
  .string({ invalid_type_error: 'Escribe un teléfono.' })
  .trim()
  .min(1, { message: 'El teléfono es obligatorio.' })
  .max(32, { message: 'El teléfono no puede pasar de 32 caracteres.' })
  .refine(
    (v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    { message: 'Escribe un teléfono de 10 dígitos. Ejemplo: 55 1234 5678.' },
  );

const name = z
  .string({ invalid_type_error: 'Escribe un nombre.' })
  .trim()
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  .max(255, { message: 'El nombre no puede pasar de 255 caracteres.' });

/** Optional: blank means "not given", which is not an invalid email. */
const email = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    return s === '' ? null : s;
  })
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: 'Escribe un correo válido o déjalo vacío.',
  });

export const customerSchema = z.object({ name, phone, email });

export type CustomerInput = z.infer<typeof customerSchema>;

/** Digits only, for matching a phone regardless of how it was typed. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}
