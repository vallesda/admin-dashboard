'use server';

import { redirect } from 'next/navigation';

import { createOrder } from '@/lib/commerce';
import { CommerceError } from '@/lib/commerce/api-client';
import type { CheckoutState } from './form-state';

/**
 * Places the order.
 *
 * Runs on the server for one reason that is not negotiable: the service token
 * authenticating the write must never reach a browser. The form posts here, the
 * seam calls the admin, the token stays put.
 *
 * The cart lines arrive as JSON in a hidden field because the cart lives in
 * localStorage and the server cannot read it. That is safe precisely because
 * only ids and quantities travel — the admin prices the order from its own
 * catalogue inside the transaction that reserves the stock (RN-008), so a
 * shopper editing this payload changes nothing but which products they ordered.
 *
 * Validation is duplicated here rather than trusted from the client: the client
 * checks are for the person filling the form, these are the ones that count.
 */
export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const rawFulfillment = String(formData.get('fulfillmentType') ?? '');
  const fulfillmentType =
    rawFulfillment === 'pickup' || rawFulfillment === 'delivery'
      ? rawFulfillment
      : null;
  const deliveryAddress = String(formData.get('deliveryAddress') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) fieldErrors.name = 'Escribe tu nombre.';

  // Ten digits is a Mexican number; anything shorter is a typo, and the phone is
  // how the shop reaches the customer to confirm the delivery.
  if (phone.replace(/\D/g, '').length < 10) {
    fieldErrors.phone = 'Escribe un teléfono de 10 dígitos.';
  }

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = 'Ese correo no parece válido.';
  }

  if (fulfillmentType === null) {
    fieldErrors.fulfillmentType = 'Elige cómo quieres recibirlo.';
  }

  if (fulfillmentType === 'delivery' && deliveryAddress.length < 10) {
    fieldErrors.deliveryAddress = 'Escribe la dirección completa de entrega.';
  }

  let lines: { productId: string; quantity: number }[] = [];

  try {
    const parsed = JSON.parse(String(formData.get('lines') ?? '[]'));
    if (Array.isArray(parsed)) lines = parsed;
  } catch {
    // Falls through to the empty-cart check below.
  }

  if (lines.length === 0) {
    return {
      error: 'Tu carrito está vacío.',
      fieldErrors,
    };
  }

  // `fulfillmentType === null` is already recorded in fieldErrors above; naming
  // it again here is what lets the compiler see it cannot be null below.
  if (Object.keys(fieldErrors).length > 0 || fulfillmentType === null) {
    return { error: null, fieldErrors };
  }

  let token: string;

  try {
    const result = await createOrder({
      customer: { name, phone, email: email || null },
      fulfillmentType,
      deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
      notes: notes || undefined,
      lines,
    });
    token = result.token;
  } catch (error) {
    // A DomainError from the admin — out of stock, product no longer sellable —
    // arrives as 422 with a message already written for a customer to read.
    // Anything else is ours, and saying so is better than blaming the shopper.
    if (error instanceof CommerceError && error.status === 422) {
      return { error: error.message, fieldErrors };
    }

    console.error('checkout failed:', error);

    return {
      error:
        'No pudimos completar tu pedido. Tu carrito sigue intacto; vuelve a intentarlo en un momento.',
      fieldErrors,
    };
  }

  // Outside the try: `redirect` works by throwing, and catching it here would
  // turn a successful order into an error message.
  redirect(`/pedido/${token}`);
}
