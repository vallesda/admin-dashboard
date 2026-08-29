'use client';

import { useActionState, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useCart } from '@/components/cart/cart-context';
import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import Button from '@/components/ui/button';
import { placeOrder } from './actions';
import { EMPTY_STATE } from './form-state';

/**
 * Checkout.
 *
 * A Client Component because the cart it is checking out lives in localStorage:
 * the server has no way to read it, so the lines travel in a hidden field.
 * Only ids and quantities go — the admin prices the order from its own
 * catalogue, so this payload cannot change what is charged.
 *
 * There is no payment step. `F6` has not started and no provider is chosen, so
 * the honest flow is: place the order, the shop confirms it, payment happens on
 * delivery or pickup. Adding a card form that goes nowhere would be worse than
 * saying that plainly.
 */
export default function CheckoutForm() {
  const { cart, subtotalCents } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, EMPTY_STATE);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 py-10">
        <p className="text-muted">
          Tu carrito está vacío, así que todavía no hay nada que pedir.
        </p>
        <Link href="/search">
          <Button variant="secondary">Ver productos</Button>
        </Link>
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
                  onChange={() => setFulfillment(option.value)}
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

          {fulfillment === 'delivery' ? (
            <Field
              name="deliveryAddress"
              label="Dirección de entrega"
              autoComplete="street-address"
              required
              hint="Calle, número, colonia y referencias."
              error={state.fieldErrors.deliveryAddress}
            />
          ) : null}

          <Field
            name="notes"
            label="Notas para tu pedido (opcional)"
            hint="Cómo quieres el corte, limpieza, o cualquier indicación."
            multiline
          />
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

        {/* Delivery is not priced in the backend, so no line is shown for it
            rather than a "$0.00" that would read as a promise of free
            delivery. */}
        <p className="text-sm text-muted">
          El costo de entrega, si aplica, se confirma junto con tu pedido.
        </p>

        <Button fullWidth type="submit" disabled={pending}>
          {pending ? 'Enviando…' : 'Confirmar pedido'}
        </Button>

        <p className="text-sm text-muted">
          No se cobra nada en línea. Confirmamos tu pedido y el pago se hace al
          recibirlo o recogerlo.
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
