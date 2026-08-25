/**
 * INV — input validation. Validates user intent, not the DB shape.
 */
import { z } from 'zod';

const quantity = z.coerce
  .number({ invalid_type_error: 'La cantidad debe ser un número.' })
  .int({ message: 'La cantidad debe ser un número entero.' })
  .max(1_000_000, { message: 'La cantidad es demasiado alta.' });

export const receiveStockSchema = z.object({
  productId: z.string().uuid({ message: 'Producto inválido.' }),
  quantity: quantity.positive({
    message: 'Para recibir, la cantidad debe ser mayor a 0.',
  }),
  note: z
    .string()
    .trim()
    .max(500, { message: 'La nota no puede pasar de 500 caracteres.' })
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
});

/**
 * An adjustment always requires a note (INV-MOV-06): a correction nobody can
 * explain is indistinguishable from a mistake.
 */
export const adjustStockSchema = z.object({
  productId: z.string().uuid({ message: 'Producto inválido.' }),
  quantity: quantity.refine((n) => n !== 0, {
    message: 'El ajuste no puede ser 0. Usa un número positivo o negativo.',
  }),
  note: z
    .string({ invalid_type_error: 'Escribe el motivo del ajuste.' })
    .trim()
    .min(3, { message: 'Explica el motivo del ajuste (mínimo 3 caracteres).' })
    .max(500, { message: 'La nota no puede pasar de 500 caracteres.' }),
});

export const setThresholdSchema = z.object({
  productId: z.string().uuid({ message: 'Producto inválido.' }),
  lowStockThreshold: z.coerce
    .number({ invalid_type_error: 'El umbral debe ser un número.' })
    .int({ message: 'El umbral debe ser un número entero.' })
    .min(0, { message: 'El umbral no puede ser negativo.' })
    .max(1_000_000, { message: 'El umbral es demasiado alto.' }),
});

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type SetThresholdInput = z.infer<typeof setThresholdSchema>;
