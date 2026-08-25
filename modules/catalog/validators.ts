/**
 * CAT — input validation.
 *
 * These schemas validate *user intent*, not the database shape. They do not
 * restate every DB constraint: uniqueness of `slug`, for instance, cannot be
 * decided here and belongs to the service.
 *
 * Messages are user-facing, so they are in Spanish (see DOCS/README.md
 * "Lenguaje del código": UI in Spanish, identifiers in English).
 */
import { z } from 'zod';

/** Lowercase letters, digits and single hyphens. No leading/trailing hyphen. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Derives a URL-safe slug from a name.
 *
 * Strips Mexican Spanish diacritics rather than dropping the characters, so
 * "Pescado fresco · Atún" becomes "pescado-fresco-atun" and not
 * "pescado-fresco-atn".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

const name = z
  .string({ invalid_type_error: 'Escribe un nombre.' })
  .trim()
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  .max(120, { message: 'El nombre no puede pasar de 120 caracteres.' });

const slug = z
  .string({ invalid_type_error: 'Escribe una URL.' })
  .trim()
  .toLowerCase()
  .min(2, { message: 'La URL debe tener al menos 2 caracteres.' })
  .max(140, { message: 'La URL no puede pasar de 140 caracteres.' })
  .regex(SLUG_PATTERN, {
    message: 'Usa solo minúsculas, números y guiones. Ejemplo: pescado-fresco.',
  });

const sortOrder = z.coerce
  .number({ invalid_type_error: 'El orden debe ser un número.' })
  .int({ message: 'El orden debe ser un número entero.' })
  .min(0, { message: 'El orden no puede ser negativo.' })
  .max(9999, { message: 'El orden no puede pasar de 9999.' });

/**
 * `slug` is optional on create: when the form leaves it blank we derive it from
 * the name, which is what an admin expects and what keeps URLs tidy.
 */
export const createCategorySchema = z.object({
  name,
  slug: slug.optional(),
  sortOrder: sortOrder.default(0),
  active: z.coerce.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name,
  slug,
  sortOrder,
  active: z.coerce.boolean(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
