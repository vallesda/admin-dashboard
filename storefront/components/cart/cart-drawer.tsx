'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/lib/commerce/types';
import { formatMoney } from '@/lib/format';
import { CURRENCY } from '@/lib/commerce/constants';
import Button from '@/components/ui/button';
import IconButton from '@/components/ui/icon-button';
import { useCart } from './cart-context';
import CrossSells from './cross-sells';
import ShippingProgress from './shipping-progress';

/**
 * Cart drawer.
 *
 * A `<dialog>` element rather than a hand-built overlay: the browser gives focus
 * trapping, Escape-to-close and inertness of the page behind for free, and all
 * three are things a custom implementation gets subtly wrong.
 *
 * `catalogue` is passed down from the root layout rather than fetched here: the
 * drawer is a Client Component and the cart lives in localStorage, so the
 * filtering has to happen on the client — but the data does not.
 */
export default function CartDrawer({
  catalogue,
}: {
  catalogue: Product[];
}) {
  const { cart, subtotalCents, isOpen, close, setQuantity, remove } = useCart();
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
      className="ml-auto mr-0 h-full max-h-full w-full max-w-md bg-background p-0 text-foreground backdrop:bg-foreground/40"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl">Tu carrito</h2>
          <IconButton label="Cerrar carrito" onClick={close}>
            <CloseIcon />
          </IconButton>
        </header>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 px-5">
            <p className="text-muted">Todavía no has agregado nada.</p>
            <Link href="/" onClick={close}>
              <Button variant="secondary">Ver productos</Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 py-4">
              {cart.lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex gap-4 border-b border-border py-4 last:border-none"
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
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.handle}`}
                      onClick={close}
                      className="text-sm font-medium hover:text-brand"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1 text-sm tabular-nums text-muted">
                      {formatMoney(line.unitPrice)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <label
                        htmlFor={`qty-${line.productId}`}
                        className="sr-only"
                      >
                        Cantidad de {line.name}
                      </label>
                      <input
                        id={`qty-${line.productId}`}
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          setQuantity(line.productId, Number(e.target.value))
                        }
                        className="h-9 w-16 rounded-sm border border-border bg-surface text-center text-sm tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => remove(line.productId)}
                        className="text-sm text-muted underline underline-offset-2 hover:text-foreground"
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

            <footer className="border-t border-border px-5 py-4">
              <ShippingProgress subtotalCents={subtotalCents} />

              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="text-xl tabular-nums">
                  {formatMoney({ amountCents: subtotalCents, currency: CURRENCY })}
                </span>
              </div>
              <Link href="/checkout" onClick={close} className="block">
                <Button fullWidth>Ir a pagar</Button>
              </Link>

              {/* Said before the click, not after: no card is taken online
                  (F6 has not started), and discovering that at the end of a
                  checkout is how a shopper stops trusting a shop. */}
              <p className="mt-3 text-sm text-muted">
                Confirmas tu pedido aquí y pagas al recibirlo o recogerlo.
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
