'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import Button from '@/components/ui/button';
import IconButton from '@/components/ui/icon-button';
import Stepper from '@/components/ui/stepper';
import { useCart } from './cart-context';
import CrossSells from './cross-sells';
import ShippingProgress from './shipping-progress';

/**
 * Cart drawer — the counter ticket.
 *
 * A `<dialog>` element rather than a hand-built overlay: the browser gives focus
 * trapping, Escape-to-close and inertness of the page behind for free, and all
 * three are things a custom implementation gets subtly wrong.
 *
 * Two things were wrong with it and both were about arithmetic the shopper was
 * being asked to do:
 *
 * 1. **No line totals.** Every row showed the unit price only, so a cart with
 *    "3 × $240 / kg" made the shopper multiply in their head to understand a
 *    subtotal they could see but not account for. Each row now carries its own
 *    total, right-aligned into the same column as the subtotal beneath it, so
 *    the sum reads down the page.
 * 2. **A bare number input.** The quantity control was `<input type="number">`
 *    and the browser's own 12px spinner — a third the size of the 44px targets
 *    the design system requires everywhere else, and placed on the one screen
 *    where a mis-tap changes what someone is charged. It is the shared
 *    `Stepper` now, the same control the product page uses.
 *
 * `catalogue` is passed down from the root layout rather than fetched here: the
 * drawer is a Client Component and the cart lives in localStorage, so the
 * filtering has to happen on the client — but the data does not.
 */
export default function CartDrawer({ catalogue }: { catalogue: Product[] }) {
  const { cart, count, subtotalCents, isOpen, close, setQuantity, remove } =
    useCart();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-label="Carrito"
      className="drawer-right ml-auto mr-0 h-full max-h-full w-full max-w-md bg-background p-0 text-foreground shadow-overlay backdrop:bg-foreground/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl font-light">
            Tu pedido
            {count > 0 ? (
              <span className="ml-2 font-sans text-sm tabular-nums text-muted">
                {count} {count === 1 ? 'artículo' : 'artículos'}
              </span>
            ) : null}
          </h2>
          <IconButton label="Cerrar carrito" onClick={close}>
            <CloseIcon />
          </IconButton>
        </header>

        {cart.lines.length === 0 ? (
          /*
           * The empty state names the shop's own situation rather than the
           * shopper's mistake. "Todavía no has agregado nada" told them what
           * they had failed to do; this tells them what is waiting, and sends
           * them to the catalogue rather than to the homepage — the homepage
           * would have meant scrolling past a hero to reach a product again.
           */
          <div className="flex flex-1 flex-col items-start justify-center gap-5 px-5 pb-16">
            <span aria-hidden="true" className="text-border-strong">
              <EmptyIcon />
            </span>
            <div>
              <p className="font-display text-xl font-light">
                Tu pedido está vacío.
              </p>
              <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted">
                El catálogo cambia con lo que llega. Mira lo que hay hoy.
              </p>
            </div>
            <Link href="/search" onClick={close}>
              <Button>Ver lo que hay hoy</Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex gap-4 border-b border-border py-5 last:border-none"
                >
                  <div className="relative h-20 w-20 flex-none overflow-hidden rounded-sm bg-sand">
                    {line.image ? (
                      <Image
                        src={line.image.url}
                        alt=""
                        fill
                        sizes="80px"
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
                      <Link
                        href={`/product/${line.handle}`}
                        onClick={close}
                        className="min-w-0 text-sm font-medium hover:text-brand"
                      >
                        {line.name}
                      </Link>
                      {/* The line's own total, in the same column as the
                          subtotal below — the one number the shopper is
                          actually agreeing to for this row. */}
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {formatMoney({
                          amountCents:
                            line.unitPrice.amountCents * line.quantity,
                          currency: line.unitPrice.currency,
                        })}
                      </span>
                    </div>

                    <p className="mt-1 text-xs tabular-nums text-muted">
                      {formatMoney(line.unitPrice)}
                      {/* Cart lines carry no unit today, so this reads as the
                          plain unit price rather than inventing a "/ kg" the
                          line does not know. */}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Stepper
                        value={line.quantity}
                        // The cart line carries no stock figure — the browser
                        // cart holds ids and quantities only, and the checkout
                        // reserves under a row lock and reports the real
                        // shortfall. So this is a typo guard, not an inventory
                        // limit: 99 pieces of one fish is past anything this
                        // shop fills, and well short of blocking a real order.
                        max={99}
                        onChange={(next) => setQuantity(line.productId, next)}
                        label={line.name}
                      />
                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        className="-my-2 shrink-0 py-2 text-sm text-muted underline underline-offset-2 transition-colors hover:text-foreground"
                      >
                        Quitar
                        <span className="sr-only"> {line.name}</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <CrossSells catalogue={catalogue} cart={cart} />

            <footer className="border-t border-border px-5 py-5">
              <ShippingProgress subtotalCents={subtotalCents} />

              <div className="mb-5 flex items-baseline justify-between border-b border-border pb-4">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="font-sans text-xl tabular-nums">
                  {formatMoney({
                    amountCents: subtotalCents,
                    currency: CURRENCY,
                  })}
                </span>
              </div>

              <Link href="/checkout" onClick={close} className="block">
                <Button fullWidth>Ir a confirmar</Button>
              </Link>

              {/* Said before the click, not after: no card is taken online
                  (F6 has not started), and discovering that at the end of a
                  checkout is how a shopper stops trusting a shop. The button
                  label matches — "Ir a pagar" promised a payment step that the
                  next screen does not have. */}
              <p className="mt-3 text-sm leading-relaxed text-muted">
                No se cobra nada en línea. Confirmas tu pedido aquí y pagas al
                recibirlo o recogerlo.
              </p>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 4l10 10M14 4L4 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The shop's own bag mark, drawn at the empty state's scale. */
function EmptyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 6h10l-.8 9.2a1.5 1.5 0 01-1.5 1.3H7.3a1.5 1.5 0 01-1.5-1.3L5 6zM7.5 6V4.75a2.5 2.5 0 015 0V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
