'use client';

import Image from 'next/image';

import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import type { CartLine, DeliveryQuote } from '@/lib/commerce/types';
import type { Cart } from '@/lib/cart';

/**
 * El panel lateral: qué se lleva y cuánto suma.
 *
 * Informativo de principio a fin. Aquí no se calcula nada —todo llega ya
 * resuelto— y el total que enseña es una vista previa: el que se cobra lo
 * vuelve a calcular el panel desde los identificadores del carrito, así que una
 * cifra equivocada aquí no puede convertirse en un cobro equivocado.
 *
 * Ya no lleva el botón. Vivía aquí cuando el checkout era una sola pantalla, y
 * con pasos la acción tiene que cerrar el paso que se está mirando: en un
 * teléfono este panel queda por debajo de todo el formulario, y el comprador
 * tenía que pasar el resumen entero para encontrar el botón. Ahora está en
 * `StepNav`, siempre en el mismo sitio.
 */
export default function OrderSummary({
  cart,
  subtotalCents,
  fulfillment,
  quote,
  quoteLoading,
}: {
  cart: Cart;
  subtotalCents: number;
  fulfillment: 'pickup' | 'delivery';
  /** La cotización vigente, o `null` mientras no haya una que sirva. */
  quote: DeliveryQuote | null;
  quoteLoading: boolean;
}) {
  return (
    <aside className="flex h-fit flex-col gap-5 rounded-sm border border-border bg-surface p-5 md:sticky md:top-6">
      <h2 className="font-display text-xl font-light">Tu pedido</h2>

      {/* El número de piezas, arriba: en «Revisar» este panel es la única
          prueba de qué se está pagando, y contar líneas a ojo no es prueba. */}
      <p className="-mt-3 text-sm text-muted">
        {cart.lines.length === 1 ? '1 producto' : `${cart.lines.length} productos`}
      </p>

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

      {/*
        Cuándo llega el pedido completo.
    
        Un pedido se entrega junto, así que si lleva un encargo **todo espera
        a la fecha más lejana** — el pescado fresco incluido. Es una
        consecuencia incómoda y por eso se dice antes de confirmar, no
        después: alguien que agregó mejillones sin darse cuenta de que llegan
        el viernes tiene derecho a sacarlos del carrito.
      */}
      <PreorderNotice cart={cart} />

      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-sm text-muted">Total</span>
        <span className="font-sans text-xl font-medium tabular-nums">
          {formatMoney({
            amountCents: subtotalCents + (quote?.covered ? quote.feeCents : 0),
            currency: CURRENCY,
          })}
        </span>
      </div>

    </aside>
  );
}

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

function PreorderNotice({ cart }: { cart: { lines: CartLine[] } }) {
  const preordered = cart.lines.filter((line) => line.arrivesOn);

  if (preordered.length === 0) return null;

  const latest = preordered
    .map((line) => new Date(line.arrivesOn as string))
    .reduce((a, b) => (a > b ? a : b));

  const fecha = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Monterrey',
  }).format(latest);

  const mixed = preordered.length < cart.lines.length;

  return (
    <div className="border border-border-strong bg-surface p-4 text-sm">
      <p className="font-medium">Tu pedido llega el {fecha}</p>
      <p className="mt-1 text-muted">
        {mixed
          ? 'Lleva productos por encargo que traemos ese día. El resto de tu pedido se entrega junto con ellos.'
          : 'Son productos por encargo: los conseguimos y te llegan ese día.'}
      </p>
    </div>
  );
}
