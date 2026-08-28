import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getOrder } from '@/lib/commerce';
import { formatMoney } from '@/lib/format';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Button from '@/components/ui/button';
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

      <div className="max-w-2xl">
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

        <Link href="/search">
          <Button variant="secondary">Seguir comprando</Button>
        </Link>
      </div>
    </Container>
  );
}
