'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import { formatCentavos } from '@/lib/money';
import { createOrder } from '../actions';
import { emptyOrderFormState, type OrderFormState } from '../form-state';

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
  const [deliveryFee, setDeliveryFee] = useState('0');

  const byId = new Map(products.map((p) => [p.id, p]));

  const subtotal = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    const qty = Number(line.quantity);
    if (!product || !Number.isFinite(qty) || qty <= 0) return sum;
    return sum + product.priceCents * qty;
  }, 0);

  const fee = fulfillment === 'delivery' ? Number(deliveryFee) * 100 || 0 : 0;

  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) =>
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );

  return (
    <form action={formAction}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* Cliente */}
        <div className="mb-6">
          <label
            htmlFor="customerId"
            className="mb-2 block text-sm font-medium"
          >
            Cliente
          </label>
          <select
            id="customerId"
            name="customerId"
            defaultValue=""
            required
            aria-describedby="customerId-error"
            className="block w-full cursor-pointer rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
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
            <p className="mt-1 text-xs text-gray-500">
              No hay clientes.{' '}
              <Link
                href="/dashboard/customers/create"
                className="text-blue-600 underline"
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
          <legend className="mb-2 block text-sm font-medium">Productos</legend>

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
                  className="rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-1">
                      <label
                        htmlFor={`line-product-${index}`}
                        className="mb-1 block text-xs text-gray-500"
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
                        className="block w-full cursor-pointer rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
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
                        className="mb-1 block text-xs text-gray-500"
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
                        className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
                      />
                    </div>

                    <div className="w-28 text-right">
                      <p className="mb-1 text-xs text-gray-500">Importe</p>
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
                        className="rounded-md border p-2 hover:bg-gray-100"
                      >
                        <span className="sr-only">Quitar línea {index + 1}</span>
                        <TrashIcon className="w-5" />
                      </button>
                    ) : null}
                  </div>

                  {/* Advisory only — the server re-checks stock inside the
                      transaction, which is the check that actually counts. */}
                  {overStock ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Solo hay {product.available} disponibles.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {products.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">
              No hay productos activos.{' '}
              <Link href="/dashboard/products" className="text-blue-600 underline">
                Activa uno
              </Link>{' '}
              para poder registrar pedidos.
            </p>
          ) : products.every((p) => p.available <= 0) ? (
            <p className="mt-2 text-xs text-amber-700">
              Ningún producto activo tiene existencias.{' '}
              <Link href="/dashboard/inventory" className="text-blue-600 underline">
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
            className="mt-2 inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium hover:bg-gray-100"
          >
            <PlusIcon className="w-4" />
            Agregar producto
          </button>

          <FieldError id="lines-error" messages={state.errors?.lines} />
        </fieldset>

        {/* Entrega */}
        <fieldset className="mb-4">
          <legend className="mb-2 block text-sm font-medium">Entrega</legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
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
                    className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                  />
                  <label
                    htmlFor={`fulfillment-${type}`}
                    className="ml-2 cursor-pointer text-sm text-gray-600"
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
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="deliveryAddress"
                className="mb-2 block text-sm font-medium"
              >
                Dirección de entrega
              </label>
              <input
                id="deliveryAddress"
                name="deliveryAddress"
                type="text"
                required
                placeholder="Av. Reforma 100, Col. Centro"
                aria-describedby="deliveryAddress-error"
                className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
              />
              <FieldError
                id="deliveryAddress-error"
                messages={state.errors?.deliveryAddress}
              />
            </div>
            <div>
              <label
                htmlFor="deliveryFeeCents"
                className="mb-2 block text-sm font-medium"
              >
                Costo de envío (MXN)
              </label>
              <input
                id="deliveryFeeCents"
                name="deliveryFeeCents"
                type="number"
                min="0"
                step="1"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                aria-describedby="deliveryFeeCents-error"
                className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
              />
              <FieldError
                id="deliveryFeeCents-error"
                messages={state.errors?.deliveryFeeCents}
              />
            </div>
          </div>
        ) : null}

        <div className="mb-4">
          <label htmlFor="notes" className="mb-2 block text-sm font-medium">
            Notas <span className="text-gray-500">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            maxLength={2000}
            placeholder="Sin espinas, entregar después de las 6."
            className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2"
          />
        </div>

        {/* Estimación; el total autoritativo lo calcula el servidor */}
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm">
          <Row label="Subtotal" value={formatCentavos(subtotal)} />
          {fulfillment === 'delivery' ? (
            <Row label="Envío" value={formatCentavos(fee)} />
          ) : null}
          <div className="mt-2 border-t pt-2">
            <Row label="Total estimado" value={formatCentavos(subtotal + fee)} bold />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            El total definitivo lo calcula el servidor con los precios vigentes
            del catálogo.
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p className="mt-4 text-sm text-red-500">{state.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/orders"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
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
      <span className={bold ? 'font-medium' : 'text-gray-500'}>{label}</span>
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
        <p className="mt-2 text-sm text-red-500" key={message}>
          {message}
        </p>
      ))}
    </div>
  );
}
