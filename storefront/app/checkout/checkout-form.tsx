'use client';

import { useActionState, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useCart } from '@/components/cart/cart-context';
import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import Button, { ButtonLink } from '@/components/ui/button';
import { placeOrder, quoteDeliveryAction } from './actions';
import type { DeliveryQuote } from '@/lib/commerce/types';
import { EMPTY_STATE } from './form-state';

/**
 * Checkout.
 *
 * A Client Component because the cart it is checking out lives in localStorage:
 * the server has no way to read it, so the lines travel in a hidden field.
 * Only ids and quantities go — the admin prices the order from its own
 * catalogue, so this payload cannot change what is charged.
 *
 * Two axes, and one rule between them. How the order is handed over — pickup or
 * delivery — is one question; how it is paid is another. The shop offers cash
 * only across its own counter, so choosing delivery leaves paying online as the
 * only option. The form enforces that by *changing the choice for you* and
 * saying why, rather than letting you pick something it will reject on submit.
 */
export default function CheckoutForm() {
  const { cart, subtotalCents } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, EMPTY_STATE);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  // `online` first because a paid order is one the shop can start cutting for
  // immediately; cash at the counter stays one click away.
  const [paymentMode, setPaymentMode] = useState<'online' | 'on_site'>('online');

  /**
   * Cash is only collected across the counter.
   *
   * Choosing delivery therefore forces the payment back to online. Done as a
   * state change rather than by disabling the option, because a disabled radio
   * that silently holds a stale value is how a form ends up submitting
   * something the person did not choose.
   */
  function chooseFulfillment(next: 'pickup' | 'delivery') {
    setFulfillment(next);
    if (next === 'delivery') setPaymentMode('online');
  }

  const [postalCode, setPostalCode] = useState('');

  /**
   * La última cotización, **etiquetada con el código postal que la produjo**.
   *
   * Guardar sólo la cotización obligaba a borrarla a mano cada vez que el
   * código postal cambiaba, y borrarla desde el cuerpo de un efecto es una
   * cascada de renders (`react-hooks/set-state-in-effect`, que lo cazó).
   *
   * Con la etiqueta, «¿esta cotización sirve para lo que hay escrito ahora?» se
   * *deriva* en vez de sincronizarse. De paso desaparece toda una clase de
   * error: la cotización de «0650» no puede quedarse en pantalla cuando el
   * campo ya dice «06500».
   */
  const [fetched, setFetched] = useState<{
    postalCode: string;
    quote: DeliveryQuote | null;
  } | null>(null);

  const wantsQuote =
    fulfillment === 'delivery' && /^[0-9]{5}$/.test(postalCode);
  const quote =
    wantsQuote && fetched?.postalCode === postalCode ? fetched.quote : null;
  const quoteLoading = wantsQuote && fetched?.postalCode !== postalCode;

  useEffect(() => {
    if (!wantsQuote) return;

    // `ignore` descarta la respuesta de una petición que quedó atrás: al
    // escribir se disparan varias y no llegan en orden.
    let ignore = false;

    quoteDeliveryAction(postalCode, subtotalCents).then((result) => {
      if (!ignore) setFetched({ postalCode, quote: result });
    });

    return () => {
      ignore = true;
    };
  }, [wantsQuote, postalCode, subtotalCents]);

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

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-3 font-display text-2xl font-light">Tus datos</legend>

          <Field
            name="name"
            label="Nombre completo"
            autoComplete="name"
            required
            error={state.fieldErrors.name}
          />
          <Field
            name="phone"
            label="Teléfono"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            hint="Por aquí te confirmamos el horario de entrega."
            error={state.fieldErrors.phone}
          />
          <Field
            name="email"
            label="Correo (opcional)"
            type="email"
            autoComplete="email"
            error={state.fieldErrors.email}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-display text-2xl font-light">
            Cómo lo quieres recibir
          </legend>

          <div className="flex flex-col gap-3 sm:flex-row">
            {(
              [
                { value: 'pickup', label: 'Recoger en tienda' },
                { value: 'delivery', label: 'Entrega a domicilio' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex flex-1 cursor-pointer items-center gap-3 rounded-sm border px-4 py-3 text-sm transition-colors ${
                  fulfillment === option.value
                    ? 'border-brand bg-brand-soft'
                    : 'border-border-strong hover:border-muted'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillmentType"
                  value={option.value}
                  checked={fulfillment === option.value}
                  onChange={() => chooseFulfillment(option.value)}
                  className="accent-brand"
                />
                {option.label}
              </label>
            ))}
          </div>

          {state.fieldErrors.fulfillmentType ? (
            <p className="text-sm text-brand">
              {state.fieldErrors.fulfillmentType}
            </p>
          ) : null}

          {/*
            The address in fields rather than one box.
            
            A sentence cannot be sorted into a route, checked against a delivery
            zone, or handed to a courier. The layout follows how the address is
            said out loud in Mexico — street and number, then colonia, then
            municipio and state — so filling it feels like dictating it.
          */}
          {fulfillment === 'delivery' ? (
            <div className="flex flex-col gap-4 border-t border-border pt-5">
              <p className="text-sm text-muted">
                Necesitamos la dirección completa para poder llegar.
              </p>

              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <Field
                  name="street"
                  label="Calle"
                  autoComplete="address-line1"
                  required
                  error={state.fieldErrors.street}
                />
                <Field
                  name="extNumber"
                  label="Núm. exterior"
                  required
                  error={state.fieldErrors.extNumber}
                />
                <Field
                  name="intNumber"
                  label="Interior"
                  hint="Opcional"
                  error={state.fieldErrors.intNumber}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="neighborhood"
                  label="Colonia"
                  autoComplete="address-level3"
                  required
                  error={state.fieldErrors.neighborhood}
                />
                <Field
                  name="postalCode"
                  label="Código postal"
                  inputMode="numeric"
                  maxLength={5}
                  autoComplete="postal-code"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.trim())}
                  error={state.fieldErrors.postalCode}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="city"
                  label="Municipio o alcaldía"
                  autoComplete="address-level2"
                  required
                  error={state.fieldErrors.city}
                />
                <StateField error={state.fieldErrors.state} />
              </div>

              {/*
                Optional in the database, asked for prominently here: in much of
                Mexico the reference is what actually gets the delivery to the
                door.
              */}
              <Field
                name="references"
                label="Referencias"
                hint="Entre qué calles, color de la fachada, algún negocio cerca."
                multiline
                error={state.fieldErrors.references}
              />
            </div>
          ) : null}

          <Field
            name="notes"
            label="Notas para tu pedido (opcional)"
            hint="Cómo quieres el corte, limpieza, o cualquier indicación."
            multiline
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-display text-2xl font-light">
            Cómo prefieres pagar
          </legend>

          {/*
            Two ways to pay, and only one of them survives a delivery.

            Cash is collected across the shop's own counter; nobody pays the
            driver. So the second option simply is not offered once delivery is
            chosen — hidden rather than disabled, because a greyed-out control
            invites the shopper to argue with it, while a short line of text
            explains the rule and moves on.
          */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {(
              [
                {
                  value: 'online' as const,
                  label: 'Pagar ahora con tarjeta',
                  detail:
                    fulfillment === 'pickup'
                      ? 'Pagas en línea y sólo pasas por tu pedido.'
                      : 'Pagas en línea y te lo llevamos a domicilio.',
                },
                {
                  value: 'on_site' as const,
                  label: 'Pagar en efectivo al recoger',
                  detail: 'Apartamos tu pedido y pagas en la tienda.',
                },
              ] as const
            )
              // Delivery leaves exactly one way to pay.
              .filter(
                (option) =>
                  fulfillment === 'pickup' || option.value === 'online',
              )
              .map((option) => (
                <label
                  key={option.value}
                  className={`flex flex-1 cursor-pointer items-start gap-3 rounded-sm border px-4 py-3 text-sm transition-colors ${
                    paymentMode === option.value
                      ? 'border-brand bg-brand-soft'
                      : 'border-border-strong hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMode"
                    value={option.value}
                    checked={paymentMode === option.value}
                    onChange={() => setPaymentMode(option.value)}
                    className="mt-0.5 accent-brand"
                  />
                  <span>
                    <span className="block">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
          </div>

          {fulfillment === 'delivery' ? (
            <p className="text-sm text-muted">
              Los pedidos a domicilio se pagan en línea. El efectivo es sólo al
              recoger en la tienda.
            </p>
          ) : null}

          {state.fieldErrors.paymentMode ? (
            <p className="text-sm text-brand">{state.fieldErrors.paymentMode}</p>
          ) : null}
        </fieldset>
      </div>

      <aside className="flex h-fit flex-col gap-5 rounded-sm border border-border bg-surface p-5 md:sticky md:top-6">
        <h2 className="font-display text-xl font-light">Tu pedido</h2>

        <ul className="flex flex-col gap-4">
          {cart.lines.map((line) => (
            <li key={line.productId} className="flex gap-3">
              <div className="relative h-14 w-14 flex-none overflow-hidden rounded-sm bg-sand">
                {line.image ? (
                  <Image
                    src={line.image.url}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-sm plate"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {line.name}
                  </p>
                  {/* Same column as the subtotal below it, for the same reason
                      the cart drawer carries one: a shopper confirming an order
                      should not have to multiply to check it. */}
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatMoney({
                      amountCents: line.unitPrice.amountCents * line.quantity,
                      currency: line.unitPrice.currency,
                    })}
                  </span>
                </div>
                <p className="mt-0.5 text-sm tabular-nums text-muted">
                  {line.quantity} × {formatMoney(line.unitPrice)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Subtotal</span>
          <span className="font-sans text-xl tabular-nums">
            {formatMoney({ amountCents: subtotalCents, currency: CURRENCY })}
          </span>
        </div>

        {/*
          El envío, en cuanto hay un código postal completo.
          
          Se cotiza contra la API mientras se escribe, porque el costo de envío
          es una de las dos cifras que deciden una compra y descubrirla al final
          es cómo una tienda se gana un carrito abandonado. Lo que se muestra es
          una vista previa: el importe que se cobra lo vuelve a calcular el
          servidor al crear el pedido.
        */}
        {fulfillment === 'delivery' ? (
          <DeliverySummary quote={quote} loading={quoteLoading} />
        ) : null}

        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm text-muted">Total</span>
          <span className="font-sans text-xl font-medium tabular-nums">
            {formatMoney({
              amountCents: subtotalCents + (quote?.covered ? quote.feeCents : 0),
              currency: CURRENCY,
            })}
          </span>
        </div>

        <Button
          fullWidth
          type="submit"
          // Bloquear el envío es correcto aquí: el pedido se rechazaría de
          // todos modos y el mensaje llegaría después de un viaje al servidor.
          disabled={pending || (fulfillment === 'delivery' && quote?.covered === false)}
        >
          {pending ? 'Enviando…' : 'Confirmar pedido'}
        </Button>

        <p className="text-sm text-muted">
          {paymentMode === 'online'
            ? 'Al confirmar te llevamos a pagar con tarjeta.'
            : 'Apartamos tu pedido y pagas en efectivo al recogerlo.'}
        </p>
      </aside>
    </form>
  );
}

/**
 * One labelled field.
 *
 * The error is tied to the input with `aria-describedby` and announced with
 * `role="alert"`, so a screen reader user hears what went wrong instead of
 * discovering it by tabbing back through the form.
 */
function Field({
  name,
  label,
  hint,
  error,
  multiline,
  ...props
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // No `outline-none` here. It emits `outline: 2px solid transparent` from the
  // utilities layer, which beats the base-layer `:focus-visible` rule — and the
  // replacement was a border swap to brand, which the error state already
  // applies. A focused invalid field had no visible focus change at all.
  const className = `w-full rounded-sm border bg-background px-3 py-2.5 text-sm focus-visible:border-brand ${
    error ? 'border-brand' : 'border-border-strong'
  }`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}

      {multiline ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={className}
        />
      ) : (
        <input
          id={name}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={className}
          {...props}
        />
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The state, as a closed list.
 *
 * Free text would give the shop "CDMX", "Ciudad de México", "D.F." and
 * "Distrito Federal" for one place, which makes a delivery zone impossible to
 * define. The list is the domain's (`modules/sales/address.ts`), reproduced
 * here because this storefront is about to become a separate deployment and
 * cannot import from the admin.
 */
function StateField({ error }: { error?: string }) {
  const errorId = error ? 'state-error' : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="state" className="text-sm font-medium">
        Estado
      </label>

      <select
        id="state"
        name="state"
        required
        defaultValue=""
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-sm border bg-background px-3 py-2.5 text-sm focus-visible:border-brand ${
          error ? 'border-brand' : 'border-border-strong'
        }`}
      >
        <option value="" disabled>
          Elige tu estado
        </option>
        {MEXICAN_STATES.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const MEXICAN_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
] as const;

/**
 * El envío, dicho como lo diría un dependiente.
 *
 * Tres desenlaces y tres frases distintas. El que más importa es el tercero:
 * «no llegamos ahí» no es «el envío cuesta cero», y confundirlos haría que
 * alguien terminara el checkout para un pedido que nadie va a poder entregar.
 */
function DeliverySummary({
  quote,
  loading,
}: {
  quote: DeliveryQuote | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">Envío</span>
        <span className="text-sm text-muted">calculando…</span>
      </div>
    );
  }

  if (!quote) {
    return (
      <p className="text-sm text-muted">
        Escribe tu código postal y calculamos el envío.
      </p>
    );
  }

  if (!quote.covered) {
    return (
      <p className="border border-brand bg-brand-soft p-3 text-sm">
        Todavía no hacemos entregas en ese código postal. Puedes recoger tu
        pedido en la tienda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">Envío · {quote.zoneName}</span>
        <span className="text-sm tabular-nums">
          {quote.feeCents === 0 ? (
            <span className="font-medium">Gratis</span>
          ) : (
            formatMoney({ amountCents: quote.feeCents, currency: CURRENCY })
          )}
        </span>
      </div>

      {/* La cifra que hace que alguien agregue otro producto. Vale la pena
          decirla en vez de dejar que la descubra por accidente. */}
      {quote.missingForFreeCents ? (
        <p className="text-xs text-muted">
          Te faltan{' '}
          {formatMoney({
            amountCents: quote.missingForFreeCents,
            currency: CURRENCY,
          })}{' '}
          para que el envío salga gratis.
        </p>
      ) : null}
    </div>
  );
}
