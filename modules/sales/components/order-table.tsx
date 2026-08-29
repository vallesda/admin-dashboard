import Link from 'next/link';
import {
  TruckIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

import type { OrderStatus } from '@/db/schema/sales';
import { formatCentavos } from '@/lib/money';
import { listOrders } from '../queries';
import { OrderStatusBadge, PaymentStatusBadge } from './order-badges';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import { ButtonLink } from '@/app/ui/button';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/**
 * The order queue — the screen this panel exists for.
 *
 * The whole row is a link on mobile and the order number is the link on desktop.
 * That asymmetry is deliberate: on a phone a 44px-tall row is the target, and on
 * a desktop a whole-row link makes text impossible to select, which matters when
 * someone is reading a phone number aloud to a customer.
 */
export default async function OrderTable({
  query,
  currentPage,
  status,
}: {
  query: string;
  currentPage: number;
  status?: OrderStatus;
}) {
  const { items } = await listOrders(query, currentPage, status);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title={
            query || status ? 'Sin pedidos que mostrar' : 'Todavía no hay pedidos'
          }
          description={
            query
              ? `Ningún pedido coincide con “${query}”. Prueba con el número, el nombre o el teléfono.`
              : status
                ? 'Ningún pedido está en este estado ahora mismo.'
                : 'Los pedidos de la tienda aparecen aquí en cuanto entran. También puedes registrar uno por teléfono.'
          }
          action={
            query || status ? null : (
              <ButtonLink href="/dashboard/orders/create">
                Registrar pedido
              </ButtonLink>
            )
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/orders/${order.id}`}
            className="block rounded-lg transition-colors hover:bg-subtle"
          >
            <RecordCard
              title={
                <span className="tabular-nums">Pedido #{order.orderNumber}</span>
              }
              subtitle={`${order.customerName} · ${order.customerPhone}`}
              badge={<OrderStatusBadge status={order.status} />}
              rows={[
                {
                  label: 'Total',
                  value: formatCentavos(order.totalCents),
                  numeric: true,
                },
                { label: 'Piezas', value: order.itemCount, numeric: true },
                {
                  label: 'Entrega',
                  value:
                    order.fulfillmentType === 'delivery' ? 'Domicilio' : 'Recoge',
                },
                { label: 'Fecha', value: dateFormat.format(order.createdAt) },
              ]}
              actions={<PaymentStatusBadge status={order.paymentStatus} />}
            />
          </Link>
        ))}
      </div>

      {/* Desktop */}
      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Pedido</TH>
            <TH>Cliente</TH>
            <TH>Entrega</TH>
            <TH align="right">Piezas</TH>
            <TH align="right">Total</TH>
            <TH>Estado</TH>
            <TH>Pago</TH>
            <TH>Fecha</TH>
          </THead>
          <TBody>
            {items.map((order) => (
              <TR key={order.id}>
                <TD className="whitespace-nowrap font-medium">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="rounded text-brand-600 hover:underline"
                  >
                    #{order.orderNumber}
                  </Link>
                </TD>
                <TD>
                  <p className="text-ink">{order.customerName}</p>
                  <p className="text-xs tabular-nums text-ink-muted">
                    {order.customerPhone}
                  </p>
                </TD>
                <TD muted className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {order.fulfillmentType === 'delivery' ? (
                      <>
                        <TruckIcon className="h-4 w-4" aria-hidden="true" />
                        Domicilio
                      </>
                    ) : (
                      <>
                        <ShoppingBagIcon className="h-4 w-4" aria-hidden="true" />
                        Recoge
                      </>
                    )}
                  </span>
                </TD>
                <TD numeric muted className="whitespace-nowrap">
                  {order.itemCount}
                </TD>
                <TD numeric className="whitespace-nowrap font-medium">
                  {formatCentavos(order.totalCents)}
                </TD>
                <TD>
                  <OrderStatusBadge status={order.status} />
                </TD>
                <TD>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </TD>
                <TD muted className="whitespace-nowrap">
                  {dateFormat.format(order.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </>
  );
}
