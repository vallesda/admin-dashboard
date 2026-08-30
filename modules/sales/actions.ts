'use server';

/**
 * SAL — Next.js adapter for Order use cases.
 *
 * Realiza: RF-SAL-001…011 · HU-SAL-001, HU-SAL-003…006.
 */
import { revalidatePath } from 'next/cache';

import { AuthorizationError, requireRole } from '@/lib/auth/guard';
import { redirectWithFlash } from '@/lib/flash';
import { failed, ok, type ActionResult } from '@/lib/action-result';
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

  const fulfillmentType = formData.get('fulfillmentType');
  const isDelivery = fulfillmentType === 'delivery';

  return {
    customerId: text('customerId') ?? '',
    fulfillmentType,
    /*
     * Derived, not asked for.
     *
     * The shop collects cash across its own counter and never from a driver, so
     * a delivery taken over the phone has exactly one way to be paid: online,
     * with the link the counter sends afterwards. A radio group whose second
     * option is always illegal is a control that exists only to be refused.
     */
    paymentMode: isDelivery ? 'online' : 'on_site',
    deliveryAddress: isDelivery
      ? {
          street: text('street'),
          extNumber: text('extNumber'),
          intNumber: text('intNumber') ?? null,
          neighborhood: text('neighborhood'),
          city: text('city'),
          state: text('state'),
          postalCode: text('postalCode'),
          references: text('references') ?? null,
        }
      : undefined,
    // Sin costo de envío en el formulario: lo cotiza el servidor. Lo único
    // que un operador puede hacer con él es perdonarlo, y sólo con motivo.
    waiveDeliveryFeeNote: text('waiveDeliveryFeeNote'),
    notes: text('notes'),
    lines,
  };
}

/**
 * Flattens Zod issues, including the ones inside `deliveryAddress`.
 *
 * `error.flatten()` only reaches the top level, so every problem with the
 * address arrived as one message on `deliveryAddress` and the operator was told
 * "revisa el pedido" with no indication of which of eight fields was wrong.
 * Nested paths are lifted to their own key, which is what the inputs are named.
 */
function fieldErrorsOf(error: {
  issues: { path: (string | number)[]; message: string }[];
}): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[issue.path.length - 1] ?? 'form');
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}

/** `staff`: taking an order is counter work, not administration. */
export async function createOrder(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const session = await requireRole('staff');

  const parsed = createOrderSchema.safeParse(readOrderForm(formData));

  /*
   * Perdonar el envío es dinero, y el dinero es de `admin` (SRS §4). Tomar el
   * pedido sigue siendo trabajo de mostrador; regalar el envío no.
   *
   * Se comprueba después de validar para que un `staff` que se equivoca de
   * campo vea el error del campo, y no un rechazo de permisos que no explica
   * nada.
   */
  if (parsed.success && parsed.data.waiveDeliveryFeeNote) {
    try {
      await requireRole('admin');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return {
          errors: { waiveDeliveryFeeNote: [error.message] },
          message: 'Perdonar el envío requiere el rol admin.',
        };
      }
      throw error;
    }
  }

  if (!parsed.success) {
    return {
      errors: fieldErrorsOf(parsed.error),
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
  redirectWithFlash(`${ORDERS_PATH}/${orderId}`, 'order.created');
}

/**
 * Advances the operational machine.
 *
 * The DomainError is allowed to propagate: the buttons only ever offer legal
 * transitions, so reaching an illegal one means a forged POST or a bug, and
 * neither should look like a normal outcome.
 */
const ORDER_STATUS_DONE: Record<OrderStatus, string> = {
  pending: 'Pedido reabierto.',
  confirmed: 'Pedido confirmado.',
  preparing: 'Pedido en preparación.',
  ready: 'Pedido listo para entregar.',
  completed: 'Pedido completado.',
  cancelled: 'Pedido cancelado y el inventario liberado.',
};

export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
): Promise<ActionResult> {
  try {
    const session = await requireRole('staff');
    await service.changeOrderStatus(orderId, next, session.user.id);
  } catch (error) {
    // A refused transition — most often a stock shortfall on confirm — is an
    // expected outcome the operator has to read, not a crash. Anything that is
    // not a DomainError is still a bug and still fails loudly.
    if (error instanceof AuthorizationError) return failed(error.message);
    if (!isDomainError(error)) throw error;
    return failed(error.message);
  }

  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);
  // Completing or cancelling moves stock, so the inventory views are stale now.
  revalidatePath('/dashboard/inventory');

  return ok(ORDER_STATUS_DONE[next]);
}


