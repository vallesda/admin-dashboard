'use server';

import { redirect } from 'next/navigation';

import { createOrder, quoteDelivery } from '@/lib/commerce';
import type { DeliveryQuote } from '@/lib/commerce/types';
import { CommerceError } from '@/lib/commerce/api-client';
import { SITE_URL } from '@/lib/shop';
import { clientIp } from '@/lib/client-ip';
import { hit } from '@/lib/rate-limit';
import type { CheckoutState } from './form-state';

/**
 * Cinco pedidos cada diez minutos desde la misma IP.
 *
 * Los números salen del negocio, no de una convención. Un hogar que compra
 * pescado hace **un** pedido; cinco cubre de sobra al que se equivoca, corrige y
 * vuelve a intentarlo, y a la familia que pide desde el mismo wifi. Diez minutos
 * es más largo que la impaciencia de una persona y más corto que la paciencia
 * de nadie que vuelva mañana.
 *
 * El coste de pasarse por corto es un cliente real bloqueado; el de pasarse por
 * largo es que un bot aparte el catálogo. Por eso el margen se da hacia arriba.
 */
const ORDER_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

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
  /*
   * El modo de pago no se lee del formulario: se decide aquí.
   *
   * Todo pedido hecho desde la tienda se cobra en línea antes de existir, así
   * que no hay nada que el navegador pueda elegir. Leerlo del `FormData` —como
   * se hacía— dejaba la regla que decide si se cobra a merced de un campo que
   * cualquiera puede editar antes de enviar.
   *
   * El efectivo sigue existiendo en el panel, para el mostrador. Esa puerta es
   * otra y tiene su propia autenticación.
   */
  const paymentMode = 'online' as const;
  const fulfillmentType =
    rawFulfillment === 'pickup' || rawFulfillment === 'delivery'
      ? rawFulfillment
      : null;
  const text = (key: string) => String(formData.get(key) ?? '').trim();

  /*
   * The address in parts, exactly as the API now expects it.
   *
   * Validated here for the person filling the form and again by the admin,
   * which is the check that counts. This one exists so a missing colonia is a
   * red line under the colonia field rather than a rejected order.
   */
  const address = {
    street: text('street'),
    extNumber: text('extNumber'),
    intNumber: text('intNumber') || null,
    neighborhood: text('neighborhood'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postalCode'),
    references: text('references') || null,
  };
  const notes = String(formData.get('notes') ?? '').trim();

  const fieldErrors: Record<string, string> = {};

  if (name.length < 2) fieldErrors.name = 'Escribe tu nombre.';

  // Ten digits is a Mexican number; anything shorter is a typo, and the phone is
  // how the shop reaches the customer to confirm the delivery.
  if (phone.replace(/\D/g, '').length < 10) {
    fieldErrors.phone = 'Escribe un teléfono de 10 dígitos.';
  }

  /*
   * El correo pasó a ser obligatorio.
   *
   * Era opcional cuando el pedido se pagaba al recibir y el teléfono bastaba
   * para todo. Ahora se cobra por adelantado, y sin correo el comprador se
   * queda sin el recibo de Stripe y sin nada escrito que pruebe lo que pagó:
   * el único rastro sería una llamada. Además es lo que llega a
   * `customer_email` de la sesión de Checkout, así que pedirlo aquí ahorra
   * pedirlo otra vez en la página de Stripe.
   *
   * Sólo aquí. `customerSchema` lo sigue aceptando nulo a propósito: el
   * mostrador levanta pedidos por teléfono y exigir un correo que el cliente
   * no dio dejaría al panel sin poder registrar una venta que ya ocurrió.
   */
  if (!email) {
    fieldErrors.email = 'Escribe tu correo: ahí te llega el comprobante.';
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = 'Ese correo no parece válido.';
  }

  if (fulfillmentType === null) {
    fieldErrors.fulfillmentType = 'Elige cómo quieres recibirlo.';
  }

  if (fulfillmentType === 'delivery') {
    if (!address.street) fieldErrors.street = 'Escribe la calle.';
    if (!address.extNumber) fieldErrors.extNumber = 'Falta el número.';
    if (!address.neighborhood) fieldErrors.neighborhood = 'Escribe la colonia.';
    if (!address.city) fieldErrors.city = 'Escribe el municipio o alcaldía.';
    if (!address.state) fieldErrors.state = 'Elige tu estado.';
    if (!/^[0-9]{5}$/.test(address.postalCode)) {
      fieldErrors.postalCode = 'El código postal son 5 dígitos.';
    }
  }

  /*
   * Las líneas se **reconstruyen**, no se reenvían.
   *
   * Antes el array recorrido salía tal cual del `JSON.parse`, así que cualquier
   * campo colado en el campo oculto —`unitPriceCents`, por ejemplo— viajaba
   * hasta el panel. No era explotable: el panel pone los precios desde su
   * catálogo y su esquema descarta lo que no conoce. Pero el tipo de arriba
   * prometía dos campos y en ejecución podían llegar cinco, y la defensa
   * dependía de que el otro servicio siguiera haciendo su parte.
   *
   * Quedarse sólo con lo que se declara cuesta tres líneas y hace verdadera la
   * firma. Una entrada con forma inservible se descarta aquí; si no queda
   * ninguna, la comprobación de carrito vacío de abajo lo cuenta.
   */
  let lines: { productId: string; quantity: number }[] = [];

  try {
    const parsed: unknown = JSON.parse(String(formData.get('lines') ?? '[]'));

    if (Array.isArray(parsed)) {
      lines = parsed
        .map((line) => ({
          productId: String((line as { productId?: unknown })?.productId ?? ''),
          quantity: Number((line as { quantity?: unknown })?.quantity ?? 0),
        }))
        .filter((l) => l.productId !== '' && Number.isInteger(l.quantity) && l.quantity > 0);
    }
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

  /*
   * El freno, justo antes de que se aparte nada.
   *
   * Va aquí y no al principio a propósito: un formulario a medio llenar no
   * gasta cuota. Lo que se limita es **crear pedidos**, que es lo que reserva
   * inventario, no escribir en la pantalla.
   *
   * Y va en la tienda, no en la API del admin, por una razón que no es obvia:
   * la llamada al admin la hace el servidor de la tienda, así que **el admin ve
   * la IP de la tienda, no la del cliente**. Un límite por IP allí estrangularía
   * a todos los visitantes como si fueran uno.
   */
  const ip = await clientIp();

  if (ip) {
    const { ok, retryAfter } = hit(`checkout:${ip}`, ORDER_RATE_LIMIT);

    if (!ok) {
      return {
        error:
          `Estás haciendo pedidos muy seguido. Espera ${retryAfter} segundos e ` +
          'inténtalo otra vez.',
        fieldErrors: {},
      };
    }
  }

  let token: string;
  let checkoutUrl: string | null = null;

  try {
    const result = await createOrder({
      customer: { name, phone, email: email || null },
      fulfillmentType,
      // The API validates `state` against the 32 federal entities; sending an
      // unknown one comes back as a 422 with a message the shopper can read.
      deliveryAddress: fulfillmentType === 'delivery' ? address : undefined,
      notes: notes || undefined,
      lines,
      paymentMode,
      // Sent from here, not hard-coded in the admin: this storefront is going
      // to become its own deployment and the admin must not carry its domain.
      // The admin validates the origin against an allow-list before handing
      // either URL to the payment provider, so this cannot become an open
      // redirect (DOCS/PAGOS.md §8.2).
      returnUrls: {
        success: `${storeOrigin()}/pedido/{TOKEN}`,
        cancel: `${storeOrigin()}/checkout?cancelado=1`,
      },
    });
    token = result.token;
    // Null when the order is payable online but no page could be opened. The
    // order is real either way, so the shopper goes to their confirmation
    // rather than to an error.
    checkoutUrl =
      result.paymentMode === 'online' ? result.payment.checkoutUrl : null;
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
  //
  // An online order goes straight to the payment page; one to be paid at the
  // counter goes to its confirmation. Either way the order already exists and
  // its stock is already reserved, so a shopper who abandons the payment page
  // still has a real order they can pay in person.
  redirect(checkoutUrl ?? `/pedido/${token}`);
}

/**
 * This storefront's own origin, for the URLs it asks to be returned to.
 *
 * Read from the environment rather than from the request so a preview
 * deployment cannot talk the admin into bouncing customers somewhere else — and
 * so the value is one the admin's allow-list can actually be configured with.
 */
function storeOrigin(): string {
  // Una sola resolución del origen, en `lib/shop`. Esta copia repetía el mismo
  // `??` que dejaba pasar la cadena vacía, y dos lugares que calculan el mismo
  // origen acaban discrepando justo cuando importa: el que el admin valida
  // contra su lista blanca tiene que ser el mismo que sale en las etiquetas.
  return SITE_URL;
}

/**
 * Cotiza el envío desde el cliente, pasando por el servidor.
 *
 * Existe sólo porque el token de servicio no puede llegar al navegador. El
 * componente llama a esta acción, la acción llama a la costura, y la credencial
 * se queda donde debe — la misma razón por la que `placeOrder` es una Server
 * Action y no un `fetch`.
 */
export async function quoteDeliveryAction(
  postalCode: string,
  subtotalCents: number,
): Promise<DeliveryQuote | null> {
  if (!/^[0-9]{5}$/.test(postalCode)) return null;

  return quoteDelivery(postalCode, Math.max(0, Math.trunc(subtotalCents)));
}
