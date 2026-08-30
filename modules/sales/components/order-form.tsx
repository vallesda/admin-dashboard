'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import { FormCard } from '@/app/ui/kit/form';
import { formatCentavos } from '@/lib/money';
import { createOrder } from '../actions';
import { emptyOrderFormState, type OrderFormState } from '../form-state';
import { MEXICAN_STATES } from '../address';

type CustomerOption = { id: string; name: string; phone: string };
type ProductOption = {
  id: string;
  sku: string;
  name: string;
  priceCents: number;
  available: number;
};

/**
 * Manual order entry — the phone/WhatsApp channel.
 *
 * The running total shown here is an estimate for the operator's benefit only.
 * The authoritative total is computed on the server from catalogue prices
 * (RN-008); nothing this component renders is trusted.
 */
export default function OrderForm({
  customers,
  products,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
}) {
  const [state, formAction, isPending] = useActionState<
    OrderFormState,
    FormData
  >(createOrder, emptyOrderFormState);

  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>(
    [{ productId: '', quantity: '1' }],
  );
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(
    'pickup',
  );

  const byId = new Map(products.map((p) => [p.id, p]));

  const subtotal = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    const qty = Number(line.quantity);
    if (!product || !Number.isFinite(qty) || qty <= 0) return sum;
    return sum + product.priceCents * qty;
  }, 0);

  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  return (
    <form action={formAction}>
      <FormCard>
        {/* Cliente */}
        <div className="mb-6">
          <label
            htmlFor="customerId"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Cliente
          </label>
          <select
            id="customerId"
            name="customerId"
            defaultValue=""
            required
            aria-describedby="customerId-error"
            className="field cursor-pointer"
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
          {customers.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-muted">
              No hay clientes.{' '}
              <Link
                href="/dashboard/customers/create"
                className="text-brand-600 underline"
              >
                Crea uno
              </Link>{' '}
              antes de registrar el pedido.
            </p>
          ) : null}
          <FieldError
            id="customerId-error"
            messages={state.errors?.customerId}
          />
        </div>

        {/* Líneas */}
        <fieldset className="mb-6">
          <legend className="mb-1.5 block text-sm font-medium text-ink">Productos</legend>

          <div className="space-y-2">
            {lines.map((line, index) => {
              const product = byId.get(line.productId);
              const qty = Number(line.quantity);
              const overStock =
                product !== undefined &&
                Number.isFinite(qty) &&
                qty > product.available;

              return (
                <div
                  key={index}
                  className="rounded-md border border-line bg-subtle/50 p-3"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-1">
                      <label
                        htmlFor={`line-product-${index}`}
                        className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                      >
                        Producto
                      </label>
                      <select
                        id={`line-product-${index}`}
                        name="line-productId"
                        value={line.productId}
                        onChange={(e) =>
                          setLine(index, { productId: e.target.value })
                        }
                        className="field cursor-pointer"
                      >
                        <option value="">Selecciona…</option>
                        {products.map((p) => (
                          <option
                            key={p.id}
                            value={p.id}
                            /* Visible but not choosable: the operator sees the
                               product exists and why it cannot be sold, instead
                               of an empty list with no explanation. */
                            disabled={p.available <= 0}
                          >
                            {p.name} ({p.sku}) — {formatCentavos(p.priceCents)}{' '}
                            {p.available > 0
                              ? `· ${p.available} disp.`
                              : '· sin stock'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label
                        htmlFor={`line-qty-${index}`}
                        className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-muted"
                      >
                        Cantidad
                      </label>
                      <input
                        id={`line-qty-${index}`}
                        name="line-quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) =>
                          setLine(index, { quantity: e.target.value })
                        }
                        className="field"
                      />
                    </div>

                    <div className="w-28 text-right">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">Importe</p>
                      <p className="py-2 text-sm tabular-nums">
                        {product && qty > 0
                          ? formatCentavos(product.priceCents * qty)
                          : '—'}
                      </p>
                    </div>

                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-transparent text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <span className="sr-only">Quitar línea {index + 1}</span>
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  {/* Advisory only — the server re-checks stock inside the
                      transaction, which is the check that actually counts. */}
                  {overStock ? (
                    <p className="mt-2 text-xs text-warn">
                      Solo hay {product.available} disponibles.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {products.length === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              No hay productos activos.{' '}
              <Link href="/dashboard/products" className="text-brand-600 underline">
                Activa uno
              </Link>{' '}
              para poder registrar pedidos.
            </p>
          ) : products.every((p) => p.available <= 0) ? (
            <p className="mt-2 text-xs text-warn">
              Ningún producto activo tiene existencias.{' '}
              <Link href="/dashboard/inventory" className="text-brand-600 underline">
                Recibe mercancía
              </Link>{' '}
              antes de registrar el pedido.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() =>
              setLines((prev) => [...prev, { productId: '', quantity: '1' }])
            }
            className="mt-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:bg-subtle"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Agregar producto
          </button>

          <FieldError id="lines-error" messages={state.errors?.lines} />
        </fieldset>

        {/* Entrega */}
        <fieldset className="mb-4">
          <legend className="mb-1.5 block text-sm font-medium text-ink">Entrega</legend>
          <div className="rounded-md border border-line bg-subtle/50 px-3.5 py-3">
            <div className="flex gap-6">
              {(['pickup', 'delivery'] as const).map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    id={`fulfillment-${type}`}
                    name="fulfillmentType"
                    type="radio"
                    value={type}
                    checked={fulfillment === type}
                    onChange={() => setFulfillment(type)}
                    className="h-4 w-4 cursor-pointer border-line-strong text-brand-600 focus:ring-brand-600"
                  />
                  <label
                    htmlFor={`fulfillment-${type}`}
                    className="ml-2 cursor-pointer text-sm text-ink"
                  >
                    {type === 'pickup' ? 'Recoge en tienda' : 'A domicilio'}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <FieldError
            id="fulfillmentType-error"
            messages={state.errors?.fulfillmentType}
          />
        </fieldset>

        {fulfillment === 'delivery' ? (
          <div className="mb-4 flex flex-col gap-4">
            {/* The shop takes cash across its own counter, never from a driver.
                Saying so here means the operator learns the rule while taking
                the order rather than from a rejected submit. */}
            <p className="rounded-md border border-line bg-subtle px-3 py-2 text-xs text-ink-muted">
              Un pedido a domicilio se cobra en línea. Al guardarlo, usa
              «Enviar liga de pago» para mandársela al cliente.
            </p>

            <AddressFields errors={state.errors} />
            {/*
              No hay campo de costo: lo cotiza el servidor desde el código
              postal. Lo único que se puede hacer con él aquí es perdonarlo, y
              sólo escribiendo por qué — una exención sin motivo no se audita.
            */}
            <div>
              <label
                htmlFor="waiveDeliveryFeeNote"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Perdonar el envío{' '}
                <span className="text-ink-muted">(opcional, requiere admin)</span>
              </label>
              <input
                id="waiveDeliveryFeeNote"
                name="waiveDeliveryFeeNote"
                type="text"
                maxLength={500}
                placeholder="Se retrasó el pedido anterior"
                aria-describedby="waiveDeliveryFeeNote-error"
                className="field"
              />
              <p className="mt-1 text-xs text-ink-muted">
                Déjalo vacío para cobrar la tarifa de la zona del código postal.
              </p>
              <FieldError
                id="waiveDeliveryFeeNote-error"
                messages={state.errors?.waiveDeliveryFeeNote}
              />
            </div>
          </div>
        ) : null}

        <div className="mb-4">
          <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-ink">
            Notas <span className="text-ink-muted">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            maxLength={2000}
            placeholder="Sin espinas, entregar después de las 6."
            className="field"
          />
        </div>

        {/* Estimación; el total autoritativo lo calcula el servidor */}
        <div className="rounded-md border border-line bg-subtle/50 p-4 text-sm">
          <Row label="Subtotal" value={formatCentavos(subtotal)} />
          {fulfillment === 'delivery' ? (
            /* El envío no se estima aquí: depende del código postal y del
               subtotal, y sale de las zonas configuradas. Poner un número
               inventado sería peor que no ponerlo — el operador lo leería en
               voz alta al cliente. */
            <Row label="Envío" value="según la zona" />
          ) : null}
          <div className="mt-2 border-t border-line pt-2">
            <Row
              label={fulfillment === 'delivery' ? 'Mercancía' : 'Total estimado'}
              value={formatCentavos(subtotal)}
              bold
            />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            El total definitivo lo calcula el servidor: los precios vigentes del
            catálogo más el envío que corresponda al código postal.
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>
          ) : null}
        </div>
      </FormCard>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          Cancelar
        </Link>
        <Button type="submit" aria-disabled={isPending}>
          {isPending ? 'Registrando…' : 'Registrar pedido'}
        </Button>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? 'font-medium text-ink' : 'text-ink-muted'}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-medium' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  return (
    <div id={id} aria-live="polite" aria-atomic="true">
      {messages?.map((message) => (
        <p className="mt-1.5 text-xs text-danger" key={message}>
          {message}
        </p>
      ))}
    </div>
  );
}

/**
 * The delivery address, in the pieces a route can be built from.
 *
 * One free-text box was enough while "a domicilio" meant a phone call and
 * someone who knew the neighbourhood. It stops being enough as soon as anyone
 * wants to sort a route or check a postal code against a zone — see
 * `modules/sales/address.ts`.
 *
 * The layout follows how a Mexican address is dictated: street and number,
 * then colonia and postal code, then municipio and state. An operator taking
 * this down over the phone fills it in the order the customer says it.
 */
function AddressFields({
  errors,
}: {
  errors?: Record<string, string[] | undefined>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-subtle/50 px-3.5 py-3.5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Text name="street" label="Calle" required errors={errors} />
        <Text name="extNumber" label="Núm. ext." required errors={errors} />
        <Text name="intNumber" label="Interior" errors={errors} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="neighborhood" label="Colonia" required errors={errors} />
        <Text
          name="postalCode"
          label="Código postal"
          required
          inputMode="numeric"
          maxLength={5}
          placeholder="06000"
          errors={errors}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Text name="city" label="Municipio o alcaldía" required errors={errors} />
        <div>
          <label
            htmlFor="state"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Estado <span aria-hidden="true" className="text-danger">*</span>
          </label>
          {/* A closed list, not free text: "CDMX" and "Ciudad de México" being
              two values makes a delivery zone impossible to define. */}
          <select
            id="state"
            name="state"
            required
            defaultValue=""
            aria-describedby="state-error"
            className="field"
          >
            <option value="" disabled>
              Elige un estado
            </option>
            {MEXICAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <FieldError id="state-error" messages={errors?.state} />
        </div>
      </div>

      <Text
        name="references"
        label="Referencias"
        placeholder="Entre qué calles, color de la fachada"
        errors={errors}
      />
    </div>
  );
}

function Text({
  name,
  label,
  required,
  errors,
  ...props
}: {
  name: string;
  label: string;
  required?: boolean;
  errors?: Record<string, string[] | undefined>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
        {required ? (
          <>
            {' '}
            <span aria-hidden="true" className="text-danger">
              *
            </span>
          </>
        ) : null}
      </label>
      <input
        {...props}
        id={name}
        name={name}
        type="text"
        required={required}
        aria-describedby={`${name}-error`}
        className="field"
      />
      <FieldError id={`${name}-error`} messages={errors?.[name]} />
    </div>
  );
}
