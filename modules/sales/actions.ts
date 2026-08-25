'use server';

/**
 * SAL — Next.js adapter for Order use cases.
 *
 * Realiza: RF-SAL-001…011 · HU-SAL-001, HU-SAL-003…006.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireRole } from '@/lib/auth/guard';
import { isDomainError } from '@/lib/errors';
import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
import * as service from './service';
import { createOrderSchema } from './validators';
import type { OrderFormState } from './form-state';

const ORDERS_PATH = '/dashboard/orders';

function toFormState(error: unknown, fallback: string): OrderFormState {
  if (!isDomainError(error)) throw error;

  if (error.field) {
    return { errors: { [error.field]: [error.message] }, message: null };
  }

  return { errors: {}, message: error.message ?? fallback };
}

/**
 * Reads the order form.
 *
 * Lines arrive as repeated `line-productId` / `line-quantity` pairs, and a row
 * left blank is dropped rather than rejected: the form starts with empty rows,
 * and making the operator delete them before submitting would be busywork.
 *
 * No price is read. The catalogue price is authoritative (RN-008).
 */
function readOrderForm(formData: FormData) {
  const productIds = formData.getAll('line-productId').map(String);
  const quantities = formData.getAll('line-quantity').map(String);

  const lines = productIds
    .map((productId, index) => ({
      productId: productId.trim(),
      quantity: quantities[index]?.trim() ?? '',
    }))
    .filter((line) => line.productId !== '' && line.quantity !== '');

  const text = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();
    return value === '' ? undefined : value;
  };

  return {
    customerId: text('customerId') ?? '',
    fulfillmentType: formData.get('fulfillmentType'),
    deliveryAddress: text('deliveryAddress'),
    deliveryFeeCents: formData.get('deliveryFeeCents') ?? 0,
    notes: text('notes'),
    lines,
  };
}

/** `staff`: taking an order is counter work, not administration. */
export async function createOrder(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const session = await requireRole('staff');

  const parsed = createOrderSchema.safeParse(readOrderForm(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      errors: fieldErrors,
      message: 'Revisa el pedido. No se registró.',
    };
  }

  let orderId: string;

  try {
    const order = await service.createOrder(parsed.data, session.user.id);
    orderId = order.id;
  } catch (error) {
    return toFormState(error, 'No se pudo registrar el pedido.');
  }

  revalidatePath(ORDERS_PATH);
  // Straight to the detail page: after taking an order the next thing anyone
  // does is confirm it or read it back to the customer.
  redirect(`${ORDERS_PATH}/${orderId}`);
}

/**
 * Advances the operational machine.
 *
 * The DomainError is allowed to propagate: the buttons only ever offer legal
 * transitions, so reaching an illegal one means a forged POST or a bug, and
 * neither should look like a normal outcome.
 */
export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
) {
  const session = await requireRole('staff');

  await service.changeOrderStatus(orderId, next, session.user.id);

  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);
  // Completing or cancelling moves stock, so the inventory views are stale now.
  revalidatePath('/dashboard/inventory');
}

/**
 * Moves the payment machine.
 *
 * `admin`, unlike the operational transitions: marking money received or
 * refunded is an accounting statement, and it is the one action in Sales that
 * nobody can undo (`refunded` is terminal).
 */
export async function changePaymentStatus(
  orderId: string,
  next: PaymentStatus,
) {
  await requireRole('admin');

  await service.changePaymentStatus(orderId, next);

  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);
}
