'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useCart } from '@/components/cart/cart-context';
import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import Button, { ButtonLink } from '@/components/ui/button';
import { useDeliveryQuote } from './use-delivery-quote';
import { placeOrder } from './actions';
import type { CartLine, DeliveryQuote } from '@/lib/commerce/types';
import { EMPTY_STATE } from './form-state';
import CustomerFields from './customer-fields';
import FulfillmentFields from './fulfillment-fields';
import OrderSummary from './order-summary';

/**
 * Checkout.
 *
 * Este archivo es el índice del formulario, no su contenido. Cada zona vive en
 * su propio archivo con el nombre de lo que pregunta:
 *
 * - `customer-fields`  … quién es y cómo se le llama
 * - `fulfillment-fields` … cómo lo recibe y a dónde
 * - `order-summary`    … qué se lleva, cuánto suma y el botón que confirma
 * - `use-delivery-quote` … cuánto cuesta el envío a ese código postal
 *
 * Es un Componente de Cliente porque el carrito que está pagando vive en
 * `localStorage`: el servidor no puede leerlo, así que las líneas viajan en un
 * campo oculto. Van sólo identificadores y cantidades — el panel pone los
 * precios desde su propio catálogo, así que este contenido no puede cambiar lo
 * que se cobra.
 *
 * Aquí queda únicamente lo que ninguna zona puede resolver sola: la elección de
 * entrega, que la zona de dirección usa para destaparse y el panel lateral para
 * cotizar, y el código postal, que sale de su zona por la misma razón.
 *
 * El modo de pago **no** está aquí ni en ninguna zona. Lo fija el servidor en
 * `placeOrder`: una regla que decide si se cobra no puede depender de un campo
 * que el navegador puede editar.
 */
export default function CheckoutForm() {
  const { cart, subtotalCents } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, EMPTY_STATE);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');

  /*
   * Antes esto además devolvía el pago a «en línea» al elegir domicilio, porque
   * el efectivo sólo se cobraba en el mostrador. Con un único camino de pago esa
   * corrección ya no tiene nada que corregir: elegir cómo recibir el pedido dejó
   * de afectar a cómo se paga.
   */
  function chooseFulfillment(next: 'pickup' | 'delivery') {
    setFulfillment(next);
  }

  const [postalCode, setPostalCode] = useState('');

  /*
   * La cotización vive en su propio hook. Era la única lógica de verdad de este
   * archivo —cuándo pedir, qué respuesta descartar, cuándo lo que hay en
   * pantalla dejó de valer— y estaba mezclada con el marcado.
   */
  const { quote, loading: quoteLoading } = useDeliveryQuote({
    enabled: fulfillment === 'delivery',
    postalCode,
    subtotalCents,
  });

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-10">
        <p className="text-muted">
          Tu carrito está vacío, así que todavía no hay nada que pedir.
        </p>
        <ButtonLink href="/search" variant="secondary">
          Ver productos
        </ButtonLink>
      </div>
    );
  }

  const lines = cart.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
  }));

  return (
    <form action={formAction} className="grid gap-12 md:grid-cols-[1fr_22rem]">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <div className="flex flex-col gap-8">
        {/* The failure the shopper cannot fix by editing a field — out of
            stock, or our own outage — is announced, not left to be noticed. */}
        {state.error ? (
          <p
            role="alert"
            className="rounded-sm border border-brand bg-brand-soft px-4 py-3 text-sm text-foreground"
          >
            {state.error}
          </p>
        ) : null}

        <CustomerFields errors={state.fieldErrors} />

        <FulfillmentFields
          fulfillment={fulfillment}
          onFulfillmentChange={chooseFulfillment}
          postalCode={postalCode}
          onPostalCodeChange={setPostalCode}
          errors={state.fieldErrors}
        />

        {/*
          Un solo camino de pago, así que no hay nada que elegir.

          Antes había dos opciones —tarjeta ahora, efectivo al recoger— y la de
          efectivo desaparecía al elegir domicilio. Ahora todo pedido de la
          tienda se paga en línea antes de existir, así que preguntar «cómo
          prefieres pagar» sería ofrecer una decisión que no existe. Se sustituye
          por la frase que sí aporta: qué va a pasar al pulsar el botón.

          El modo no viaja en el formulario. Lo fija el servidor en
          `placeOrder`, porque una regla que decide si se cobra o no no puede
          depender de un campo que el navegador puede editar.

          El mostrador conserva el cobro en efectivo: eso vive en el panel, y
          esta pantalla no lo toca.
        */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-3 font-display text-2xl font-light">
            Cómo se paga
          </legend>

          <p className="text-sm text-muted">
            {fulfillment === 'pickup'
              ? 'Pagas ahora con tarjeta y sólo pasas por tu pedido a la tienda.'
              : 'Pagas ahora con tarjeta y te lo llevamos a domicilio.'}
          </p>

          <p className="text-sm text-muted">
            Tu pedido se aparta cuando el pago se confirma.
          </p>
        </fieldset>
      </div>

      <OrderSummary
        cart={cart}
        subtotalCents={subtotalCents}
        fulfillment={fulfillment}
        quote={quote}
        quoteLoading={quoteLoading}
        pending={pending}
      />
    </form>
  );
}
