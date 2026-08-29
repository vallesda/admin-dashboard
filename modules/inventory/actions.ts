'use server';

/**
 * INV — Next.js adapter for stock operations.
 *
 * Realiza: RF-INV-003, RF-INV-004, RF-INV-008 · HU-INV-002, HU-INV-003.
 *
 * Adapter work only: authorize, parse, call the service, revalidate. The rules
 * and the transaction live in `service.ts`.
 */
import { revalidatePath } from 'next/cache';

import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { failed, ok, type ActionResult } from '@/lib/action-result';
import { isDomainError } from '@/lib/errors';
import * as service from './service';
import {
  receiveStockSchema,
  adjustStockSchema,
  setThresholdSchema,
} from './validators';
import type { StockFormState } from './form-state';

const INVENTORY_PATH = '/dashboard/inventory';

function toFormState(error: unknown, fallback: string): StockFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

/**
 * Receiving and adjusting are `staff` operations, not `admin`.
 *
 * Whoever unloads the delivery is the person who should record it. Requiring
 * `admin` here would push the whole shop to share one privileged account, which
 * is worse for security than granting the narrow permission.
 */
export async function receiveStock(
  productId: string,
  _prevState: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  const session = await requireRole('staff');

  const parsed = receiveStockSchema.safeParse({
    productId,
    quantity: formData.get('quantity'),
    note: formData.get('note') ?? undefined,
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los datos. No se registró la entrada.',
    };
  }

  try {
    await service.receiveStock(parsed.data, session.user.id);
  } catch (error) {
    return toFormState(error, 'No se pudo registrar la entrada.');
  }

  revalidatePath(INVENTORY_PATH);
  revalidatePath(`${INVENTORY_PATH}/${productId}`);

  return { errors: {}, message: null, done: 'Entrada registrada.' };
}

export async function adjustStock(
  productId: string,
  _prevState: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  const session = await requireRole('staff');

  const parsed = adjustStockSchema.safeParse({
    productId,
    quantity: formData.get('quantity'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa los datos. No se registró el ajuste.',
    };
  }

  try {
    await service.adjustStock(parsed.data, session.user.id);
  } catch (error) {
    return toFormState(error, 'No se pudo registrar el ajuste.');
  }

  revalidatePath(INVENTORY_PATH);
  revalidatePath(`${INVENTORY_PATH}/${productId}`);

  return { errors: {}, message: null, done: 'Ajuste registrado en el ledger.' };
}

/**
 * Changing the alert threshold is a policy decision, not stock handling, so it
 * needs `admin`.
 */
export async function setLowStockThreshold(
  productId: string,
  _prevState: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await requireRole('admin');

  const parsed = setThresholdSchema.safeParse({
    productId,
    lowStockThreshold: formData.get('lowStockThreshold'),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Revisa el umbral. No se guardó.',
    };
  }

  try {
    await service.setLowStockThreshold(parsed.data);
  } catch (error) {
    return toFormState(error, 'No se pudo guardar el umbral.');
  }

  revalidatePath(INVENTORY_PATH);
  revalidatePath(`${INVENTORY_PATH}/${productId}`);

  return { errors: {}, message: null, done: 'Umbral actualizado.' };
}

/**
 * Creates the missing inventory row for a product.
 *
 * `staff` because it is stock handling, not policy — and because a product
 * nobody can receive is an operational blocker, not something to wait on an
 * admin for.
 */
export async function ensureInventory(
  productId: string,
): Promise<ActionResult> {
  try {
    await requireRole('staff');
    await service.ensureInventory(productId);
  } catch (error) {
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(INVENTORY_PATH);
  revalidatePath(`${INVENTORY_PATH}/${productId}`);

  return ok('Inventario inicializado en cero. Ya puedes recibir mercancía.');
}
