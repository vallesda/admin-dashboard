'use server';

/**
 * CLI — Next.js adapter for Customer use cases.
 *
 * Realiza: RF-CLI-001, RF-CLI-002 · HU-CLI-001.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import * as service from './service';
import { customerSchema } from './validators';
import type { CustomerFormState } from './form-state';

const CUSTOMERS_PATH = '/dashboard/customers';

function toFormState(error: unknown, fallback: string): CustomerFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? undefined,
  };
}

/**
 * `staff`, not `admin`.
 *
 * Whoever takes the order on the phone is the person who registers the
 * customer. Requiring admin here would block the till.
 */
export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireRole('staff');

  const parsed = customerSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los datos. No se creó el cliente.',
    };
  }

  try {
    await service.createCustomer(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo crear el cliente.');
  }

  revalidatePath(CUSTOMERS_PATH);
  redirect(CUSTOMERS_PATH);
}

export async function updateCustomer(
  id: string,
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireRole('staff');

  const parsed = customerSchema.safeParse(readForm(formData));

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los datos. No se guardó el cliente.',
    };
  }

  try {
    await service.updateCustomer(id, parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar el cliente.');
  }

  revalidatePath(CUSTOMERS_PATH);
  redirect(CUSTOMERS_PATH);
}
