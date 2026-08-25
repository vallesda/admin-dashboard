'use server';

/**
 * CAT — Next.js adapter for Category use cases.
 *
 * Realiza: RF-CAT-001 · HU-CAT-001.
 *
 * This file does adapter work only — authorize, parse input, call the service,
 * revalidate. Business rules live in `service.ts` (DOCS/README.md, regla de
 * gobierno 2 y 3).
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireRole } from '@/app/lib/auth-guard';
import { isDomainError } from '@/lib/errors';
import * as service from './service';
import { createCategorySchema, updateCategorySchema } from './validators';
import type { CategoryFormState } from './form-state';

const CATEGORIES_PATH = '/dashboard/categories';

/** FormData → the shape the Zod schemas expect. */
function readForm(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim();

  return {
    name: formData.get('name'),
    // An empty slug field means "derive it from the name", so it must reach the
    // schema as undefined rather than as ''.
    slug: slug === '' ? undefined : slug,
    sortOrder: formData.get('sortOrder') ?? 0,
    // An unchecked checkbox is absent from FormData entirely, which is the
    // difference between "false" and "missing".
    active: formData.get('active') === 'on',
  };
}

/**
 * Turns a DomainError into a field error when it names a field, and into a
 * form-level message otherwise. Anything that is not a DomainError is a real
 * bug and is rethrown so it surfaces instead of being hidden behind a friendly
 * message.
 */
function toFormState(error: unknown, fallback: string): CategoryFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole('admin');

  const parsed = createCategorySchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se creó la categoría.',
    };
  }

  try {
    await service.createCategory(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo crear la categoría.');
  }

  revalidatePath(CATEGORIES_PATH);
  redirect(CATEGORIES_PATH);
}

export async function updateCategory(
  id: string,
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole('admin');

  const parsed = updateCategorySchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Faltan campos o hay errores. No se guardó la categoría.',
    };
  }

  try {
    await service.updateCategory(id, parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar la categoría.');
  }

  revalidatePath(CATEGORIES_PATH);
  redirect(CATEGORIES_PATH);
}

/**
 * Toggles a category between active and inactive.
 *
 * The MVP has no delete: `RF-CAT-001` asks for an active flag, and deactivating
 * keeps every product's `category_id` intact.
 */
export async function toggleCategoryActive(id: string, active: boolean) {
  await requireRole('admin');

  await service.setCategoryActive(id, active);

  revalidatePath(CATEGORIES_PATH);
}
