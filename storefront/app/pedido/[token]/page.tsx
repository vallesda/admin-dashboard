import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getOrder } from '@/lib/commerce';
import { formatMoney } from '@/lib/format';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import { ButtonLink } from '@/components/ui/button';
import ClearCart from './clear-cart';
import Eyebrow from '@/components/ui/eyebrow';
import { RHYTHM } from '@/components/ui/section';

export const metadata: Metadata = {
  title: 'Tu pedido',
  // Contains a customer's name and address. It must never be indexed, and the
  // referrer must not carry the token to whatever they click next.
  robots: { index: false, follow: false, nocache: true },
};

/** What the shop calls each state, in the customer's words rather than ours. */
const STATUS_LABEL: Record<string, string> = {
  pending: 'Recibido — lo estamos confirmando',
  confirmed: 'Confirmado',
  preparing: 'Preparándose',
  ready: 'Listo',
  completed: 'Entregado',
  cancelled: 'Cancelado',
};

const FULFILLMENT_LABEL: Record<string, string> = {
  pickup: 'Recoger en tienda',
  delivery: 'Entrega a domicilio',
};

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrder(token);

  // A wrong or expired link is a genuine 404, not a page apologising. The
  // storefront never says whether the token merely does not exist — it cannot
  // be used to probe for valid ones.
  if (!order) notFound();

  const isCancelled = order.status === 'cancelled';

  return (
    <Container className={RHYTHM.sm}>
      <ClearCart token={token} />

      {/*
        Two columns from `lg`: the receipt on the left, the illustration on the
        right. `items-start` so the artwork sits at the top of its column rather
        than centring against a receipt whose height depends on how many lines
        the order has.
      */}
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,42rem)_1fr] lg:gap-16">
        <div>
        <Eyebrow className="mb-3">
          Pedido #{order.orderNumber}
        </Eyebrow>

        <Heading as="h1" className="mb-4">
          {isCancelled ? 'Este pedido fue cancelado' : 'Gracias, ' + order.customerName.split(' ')[0]}
        </Heading>

        <p className="mb-10 max-w-[52ch] text-muted">
          {isCancelled
            ? 'Si crees que fue un error, escríbenos citando el número de pedido.'
            : 'Recibimos tu pedido. Te contactamos al teléfono que nos diste para confirmar el horario y el punto de entrega.'}
        </p>

        <dl className="mb-10 grid grid-cols-1 gap-6 border-y border-border py-6 sm:grid-cols-3">
          <div>
            <Eyebrow as="dt">
              Estado
            </Eyebrow>
            <dd className="mt-1 text-sm">
              {STATUS_LABEL[order.status] ?? order.status}
            </dd>
          </div>
          <div>
            <Eyebrow as="dt">
              Entrega
            </Eyebrow>
            <dd className="mt-1 text-sm">
              {FULFILLMENT_LABEL[order.fulfillmentType] ?? order.fulfillmentType}
            </dd>
          </div>
          <div>
            <Eyebrow as="dt">
              Pago
            </Eyebrow>
            <dd className="mt-1 text-sm">
              {order.paymentStatus === 'paid' ? 'Pagado' : 'Al recibir'}
            </dd>
          </div>
        </dl>

        {order.deliveryAddress ? (
          <div className="mb-10">
            <Eyebrow as="h2">Dirección</Eyebrow>
            <p className="mt-1 text-sm">{order.deliveryAddress}</p>
          </div>
        ) : null}

        <h2 className="mb-4 font-display text-2xl">Lo que pediste</h2>

        <ul className="mb-6 flex flex-col divide-y divide-border border-y border-border">
          {order.lines.map((line) => (
            <li
              key={line.name}
              className="flex items-baseline justify-between gap-4 py-4"
            >
              <span className="text-sm">
                {line.name}
                <span className="text-muted"> × {line.quantity}</span>
              </span>
              <span className="flex-none text-sm tabular-nums">
                {formatMoney(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mb-10 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
          </div>
          {order.deliveryFee.amountCents > 0 ? (
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Entrega</dt>
              <dd className="tabular-nums">{formatMoney(order.deliveryFee)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="text-sm">Total</dt>
            <dd className="text-xl tabular-nums">{formatMoney(order.total)}</dd>
          </div>
        </dl>

        <p className="mb-8 text-sm text-muted">
          Guarda este enlace: es la única forma de volver a ver tu pedido.
        </p>

          <ButtonLink href="/search" variant="secondary">
            Seguir comprando
          </ButtonLink>
        </div>

        <OrderIllustration cancelled={isCancelled} />
      </div>
    </Container>
  );
}

/**
 * The storefront's one ornamental image.
 *
 * The design system bans illustration *as a substitute for product
 * photography* — the photo is the only proof of freshness a browser can carry,
 * and a drawn fish where a real one belongs destroys exactly that. This is the
 * other case: a confirmation page has no product to photograph, the sale is
 * already made, and nothing here stands in for evidence. See the carve-out
 * recorded in DESIGN.md.
 *
 * The asset in `public/` is a processed copy, and that mattered. The original
 * shipped with a baked #FDFAF3 background and no alpha channel — three points
 * lighter than the page's own cream, which rendered as a visible pale rectangle
 * floating on the page. `mix-blend-multiply` does NOT fix that, which was the
 * first attempt: multiply only erases a ground that is pure white, and #FDFAF3
 * multiplied against cream comes out *darker* than the page. So the paper was
 * cut to real transparency instead — 91% of the file is alpha now — which also
 * took it from 1.4 MB to 361 KB and makes the drawing reusable on any surface
 * rather than only on cream.
 *
 * `alt=""` and `aria-hidden`: it is decorative. Every fact on this page is
 * already in the text beside it, and announcing "dibujo de un pescado colgado
 * de un gancho" adds nothing to somebody's order.
 *
 * Hidden below `lg`. On a phone the receipt is the whole point, and the artwork
 * would push the order lines — the thing the customer opened the link to read —
 * below the fold.
 */
function OrderIllustration({ cancelled }: { cancelled: boolean }) {
  // A cancelled order is not a moment to decorate.
  if (cancelled) return null;

  return (
    <div className="hidden lg:block">
      <Image
        src="/illustrations/confirmation-fish.png"
        alt=""
        aria-hidden="true"
        width={800}
        height={1200}
        sizes="(min-width: 1024px) 30vw, 0px"
        className="mx-auto h-auto w-full max-w-[22rem]"
      />
    </div>
  );
}
