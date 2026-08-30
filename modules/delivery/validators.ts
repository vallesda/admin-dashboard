/**
 * DEL — validación de entrada.
 */
import { z } from 'zod';

import { parsePesosToCentavos } from '@/lib/money';

const money = (label: string) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    const centavos = parsePesosToCentavos(value);

    if (centavos === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Escribe ${label} válido. Ejemplo: 50.00`,
      });
      return z.NEVER;
    }

    return centavos;
  });

/**
 * Los códigos postales llegan como un bloque de texto.
 *
 * Pegar una columna desde una hoja de cálculo es cómo se carga una zona de
 * verdad, así que se acepta cualquier separador razonable —coma, espacio, salto
 * de línea— en vez de obligar a un formato que nadie recuerda.
 */
const postalCodes = z
  .string()
  .transform((raw) =>
    Array.from(
      new Set(
        raw
          .split(/[\s,;]+/)
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ),
  )
  .superRefine((codes, ctx) => {
    const bad = codes.filter((c) => !/^[0-9]{5}$/.test(c));

    if (bad.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Estos no son códigos postales de 5 dígitos: ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`,
      });
    }

    if (codes.length > 2000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Son demasiados códigos postales para una sola zona.',
      });
    }
  });

export const zoneSchema = z.object({
  name: z
    .string({ invalid_type_error: 'Escribe un nombre.' })
    .trim()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
    .max(120, { message: 'El nombre no puede pasar de 120 caracteres.' }),
  // Cero es legítimo: una zona de reparto gratuito es una decisión comercial.
  feeCents: money('un costo').pipe(
    z
      .number()
      .int()
      .min(0, { message: 'El costo no puede ser negativo.' })
      .max(9_999_99, { message: 'Ese costo de envío es demasiado alto.' }),
  ),
  freeOverCents: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v, ctx) => {
      if (v === null || v === undefined || String(v).trim() === '') return null;

      const centavos = parsePesosToCentavos(v);

      if (centavos === null || centavos <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Escribe un monto mayor a $0.00 o déjalo vacío.',
        });
        return z.NEVER;
      }

      return centavos;
    }),
  sortOrder: z.coerce
    .number({ invalid_type_error: 'El orden debe ser un número.' })
    .int()
    .min(0)
    .max(9999)
    .default(0),
  active: z.coerce.boolean().default(true),
  postalCodes,
});

export type ZoneInput = z.infer<typeof zoneSchema>;

/** Perdonar el envío: el motivo es obligatorio, no decorativo. */
export const waiveFeeSchema = z.object({
  note: z
    .string({ invalid_type_error: 'Escribe el motivo.' })
    .trim()
    .min(4, { message: 'Escribe por qué se perdona el envío.' })
    .max(500, { message: 'El motivo no puede pasar de 500 caracteres.' }),
});
