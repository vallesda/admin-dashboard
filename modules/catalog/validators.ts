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

import { parsePesosToCentavos } from '@/lib/money';

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
 * Trimmed free text that becomes `null` when blank.
 *
 * Declared here rather than beside the product schemas because categories,
 * packages and products all use it, and a `const` arrow read above its own
 * declaration is a temporal-dead-zone error the moment this module evaluates.
 */
const optionalText = (max: number, label: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const s = typeof v === 'string' ? v.trim() : '';
      return s === '' ? null : s;
    })
    .refine((v) => v === null || v.length <= max, {
      message: `${label} no puede pasar de ${max} caracteres.`,
    });

/**
 * `slug` is optional on create: when the form leaves it blank we derive it from
 * the name, which is what an admin expects and what keeps URLs tidy.
 */
export const createCategorySchema = z.object({
  name,
  slug: slug.optional(),
  sortOrder: sortOrder.default(0),
  active: z.coerce.boolean().default(true),
  // Merchandising: what the storefront's home shelf needs to present a
  // category rather than merely list it.
  tagline: optionalText(160, 'La frase'),
  imageUrl: optionalText(2048, 'La URL de la imagen'),
  isFeatured: z.coerce.boolean().default(false),
});

export const updateCategorySchema = z.object({
  name,
  slug,
  sortOrder,
  active: z.coerce.boolean(),
  tagline: optionalText(160, 'La frase'),
  imageUrl: optionalText(2048, 'La URL de la imagen'),
  isFeatured: z.coerce.boolean().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

/** Uppercase letters, digits and hyphens: `SAL-500`. */
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

const sku = z
  .string({ invalid_type_error: 'Escribe un SKU.' })
  .trim()
  .toUpperCase()
  .min(2, { message: 'El SKU debe tener al menos 2 caracteres.' })
  .max(64, { message: 'El SKU no puede pasar de 64 caracteres.' })
  .regex(SKU_PATTERN, {
    message: 'Usa solo mayúsculas, números y guiones. Ejemplo: SAL-500.',
  });

const productName = z
  .string({ invalid_type_error: 'Escribe un nombre.' })
  .trim()
  .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  .max(255, { message: 'El nombre no puede pasar de 255 caracteres.' });

const productSlug = z
  .string({ invalid_type_error: 'Escribe una URL.' })
  .trim()
  .toLowerCase()
  .min(2, { message: 'La URL debe tener al menos 2 caracteres.' })
  .max(255, { message: 'La URL no puede pasar de 255 caracteres.' })
  .regex(SLUG_PATTERN, {
    message: 'Usa solo minúsculas, números y guiones. Ejemplo: salmon-500-g.',
  });

/**
 * Price typed in pesos, stored in centavos (RN-002).
 *
 * The transform runs before the range check, so "$349.50" becomes 34950 and
 * then has to clear `> 0` (INV-PRO-01).
 */
const priceCents = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const centavos = parsePesosToCentavos(value);

    if (centavos === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe un precio válido. Ejemplo: 349.00',
      });
      return z.NEVER;
    }

    return centavos;
  })
  .pipe(
    z
      .number()
      .int()
      .positive({ message: 'El precio debe ser mayor a $0.00.' })
      .max(99_999_999, { message: 'El precio es demasiado alto.' }),
  );

/** Cost is optional; blank means "not recorded", which is not the same as 0. */
const costCents = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || String(value).trim() === '') return null;

    const centavos = parsePesosToCentavos(value);

    if (centavos === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe un costo válido o déjalo vacío.',
      });
      return z.NEVER;
    }

    if (centavos < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El costo no puede ser negativo.',
      });
      return z.NEVER;
    }

    return centavos;
  });


const netWeightGrams = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }

    const grams = Number(String(value).trim());

    if (!Number.isInteger(grams) || grams <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El peso neto debe ser un número entero de gramos mayor a 0.',
      });
      return z.NEVER;
    }

    return grams;
  });

const categoryId = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, {
    message: 'Selecciona una categoría válida.',
  });

const unitType = z.enum(['piece', 'pack'], {
  invalid_type_error: 'Selecciona cómo se vende el producto.',
  required_error: 'Selecciona cómo se vende el producto.',
});

const baseProduct = z.object({
  sku,
  name: productName,
  slug: productSlug.optional(),
  description: optionalText(2000, 'La descripción'),
  categoryId,
  priceCents,
  costCents,
  imageUrl: optionalText(2000, 'La URL de la imagen'),
  unitType,
  netWeightGrams,
});

/**
 * A `pack` is a closed package, so its net weight is what the customer is
 * actually buying — without it the listing cannot state what it sells. A
 * `piece` is sold by unit and may legitimately have no weight.
 */
const requirePackWeight = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data: z.infer<T>, ctx: z.RefinementCtx) => {
    if (data.unitType === 'pack' && data.netWeightGrams === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['netWeightGrams'],
        message: 'Un paquete necesita su peso neto en gramos.',
      });
    }
  });

export const createProductSchema = requirePackWeight(baseProduct);

export const updateProductSchema = requirePackWeight(
  baseProduct.extend({ slug: productSlug }),
);

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---------------------------------------------------------------------------
// Package
// ---------------------------------------------------------------------------

/*
 * Declared after Product on purpose: it reuses `optionalText`, and a `const`
 * arrow used above its own declaration would be a temporal-dead-zone error the
 * moment this module is evaluated.
 */

export const createPackageSchema = z.object({
  name,
  slug: slug.optional(),
  tagline: optionalText(160, 'La frase'),
  description: optionalText(2000, 'La descripción'),
  imageUrl: optionalText(2048, 'La URL de la imagen'),
  sortOrder: sortOrder.default(0),
  active: z.coerce.boolean().default(true),
});

export const updatePackageSchema = z.object({
  name,
  slug,
  tagline: optionalText(160, 'La frase'),
  description: optionalText(2000, 'La descripción'),
  imageUrl: optionalText(2048, 'La URL de la imagen'),
  sortOrder,
  active: z.coerce.boolean(),
});

/**
 * One line of a package.
 *
 * The quantity ceiling is a typo guard, not an inventory limit — stock is
 * checked when the order reserves it, not when the bundle is written.
 */
export const packageItemSchema = z.object({
  productId: z.string().uuid({ message: 'Elige un producto.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Escribe una cantidad.' })
    .int({ message: 'La cantidad debe ser un número entero.' })
    .min(1, { message: 'La cantidad mínima es 1.' })
    .max(99, { message: 'La cantidad máxima es 99.' }),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type PackageItemInput = z.infer<typeof packageItemSchema>;
