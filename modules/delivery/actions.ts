'use server';

/**
 * DEL — Server Actions.
 *
 * `admin` en todas: una zona de reparto decide lo que se le cobra a la gente,
 * y eso no es trabajo de mostrador (SRS §4, misma familia que ajustar precios).
 */
import { revalidatePath } from 'next/cache';

import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import { failed, ok, type ActionResult } from '@/lib/action-result';
import { redirectWithFlash } from '@/lib/flash';
import * as service from './service';
import { zoneSchema } from './validators';
import type { ZoneFormState } from './form-state';

const ZONES_PATH = '/dashboard/delivery';

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    feeCents: formData.get('feeCents') ?? '0',
    freeOverCents: formData.get('freeOverCents'),
    sortOrder: formData.get('sortOrder') ?? 0,
    active: formData.get('active') === 'on',
    postalCodes: String(formData.get('postalCodes') ?? ''),
  };
}

function toFormState(error: unknown, fallback: string): ZoneFormState {
  if (error instanceof AuthorizationError) {
    return { errors: {}, message: error.message };
  }
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

function fieldErrorsOf(error: {
  issues: { path: (string | number)[]; message: string }[];
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

export async function createZone(
  _prev: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  const parsed = zoneSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: fieldErrorsOf(parsed.error),
      message: 'Revisa la zona. No se creó.',
    };
  }

  try {
    await requireRole('admin');
    await service.createZone(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo crear la zona.');
  }

  revalidatePath(ZONES_PATH);
  redirectWithFlash(ZONES_PATH, 'zone.created');
}

export async function updateZone(
  id: string,
  _prev: ZoneFormState,
  formData: FormData,
): Promise<ZoneFormState> {
  const parsed = zoneSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: fieldErrorsOf(parsed.error),
      message: 'Revisa la zona. No se guardó.',
    };
  }

  try {
    await requireRole('admin');
    await service.updateZone(id, parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar la zona.');
  }

  revalidatePath(ZONES_PATH);
  redirectWithFlash(ZONES_PATH, 'zone.updated');
}

export async function deleteZone(id: string): Promise<ActionResult> {
  try {
    await requireRole('admin');
    await service.deleteZone(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(ZONES_PATH);
  return ok('Zona eliminada.');
}
