import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import Panel from '@/app/ui/kit/panel';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import { formatCentavos } from '@/lib/money';
import { getOrderById } from '@/modules/sales/queries';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/modules/sales/components/order-badges';
import {
  OrderStatusActions,
  PaymentStatusActions,
} from '@/modules/sales/components/order-actions';

export const metadata = { title: 'Detalle de pedido' };

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/**
 * One order, and the two machines that move it.
 *
 * The three panels across the top are ordered by what the operator does with
 * them: who to call, what to do next, whether the money has landed. The line
 * items follow, because by the time you are reading them you have already
 * decided to work the order.
 *
 * Fulfilment and payment stay in separate panels — they are orthogonal state
 * machines (RN-006), and merging them into one "status" block would suggest a
 * sequence between them that does not exist.
 */
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const order = await getOrderById(id);

  if (!order) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Pedidos', href: '/dashboard/orders' },
          {
            label: `Pedido #${order.orderNumber}`,
            href: `/dashboard/orders/${id}`,
            active: true,
          },
        ]}
      />

      <PageHeader
        title={`Pedido #${order.orderNumber}`}
        description={dateFormat.format(order.createdAt)}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Contacto: la copia guardada en el pedido, no la ficha actual */}
        <Panel
          title="Cliente"
          footer={
            <p className="text-xs text-ink-muted">
              Copia guardada al registrar el pedido. Editar la ficha del cliente
              no la cambia.
            </p>
          }
        >
          <p className="font-medium text-ink">{order.customerName}</p>
          <p className="text-sm tabular-nums text-ink-muted">
            {order.customerPhone}
          </p>
          {order.customerEmail ? (
            <p className="text-sm text-ink-muted">{order.customerEmail}</p>
          ) : null}

          <p className="mt-3 border-t border-line pt-3 text-sm text-ink">
            {order.fulfillmentType === 'delivery'
              ? 'Entrega a domicilio'
              : 'Recoge en tienda'}
          </p>
          {order.deliveryAddress ? (
            <p className="mt-0.5 text-sm text-ink-muted">
              {order.deliveryAddress}
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Estado del pedido"
          description="Cumplimiento: qué falta para entregarlo."
        >
          <OrderStatusActions orderId={order.id} status={order.status} />
          {order.completedAt ? (
            <p className="mt-3 text-xs text-ink-muted">
              Completado el {dateFormat.format(order.completedAt)}
            </p>
          ) : null}
          {order.cancelledAt ? (
            <p className="mt-3 text-xs text-ink-muted">
              Cancelado el {dateFormat.format(order.cancelledAt)}
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Pago"
          description="Independiente del estado del pedido."
        >
          <PaymentStatusActions
            orderId={order.id}
            paymentStatus={order.paymentStatus}
          />
        </Panel>
      </div>

      <TableShell>
        <Table>
          <THead>
            <TH>Producto</TH>
            <TH>SKU</TH>
            <TH align="right">Precio</TH>
            <TH align="right">Cantidad</TH>
            <TH align="right">Importe</TH>
          </THead>
          <TBody>
            {order.items.map((item) => (
              <TR key={item.id}>
                <TD className="font-medium">{item.productName}</TD>
                <TD muted className="font-mono text-xs">
                  {item.sku}
                </TD>
                <TD numeric muted>
                  {formatCentavos(item.unitPriceCents)}
                </TD>
                <TD numeric>{item.quantity}</TD>
                <TD numeric className="font-medium">
                  {formatCentavos(item.lineTotalCents)}
                </TD>
              </TR>
            ))}
          </TBody>

          {/*
            The totals are a `<tfoot>` in the same table rather than a separate
            block underneath it. That is what puts "Total" in the same column as
            the line amounts it sums — previously the summary was its own
            two-column flex row, so the figure the operator quotes on the phone
            sat at a different x-position from every number that produced it.
          */}
          <tfoot className="border-t-2 border-line bg-subtle/60">
            <tr>
              <td colSpan={3} />
              <td className="px-4 py-2 text-right text-xs uppercase tracking-wider text-ink-muted">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right text-sm tabular-nums">
                {formatCentavos(order.subtotalCents)}
              </td>
            </tr>
            {order.deliveryFeeCents > 0 ? (
              <tr>
                <td colSpan={3} />
                <td className="px-4 py-2 text-right text-xs uppercase tracking-wider text-ink-muted">
                  Envío
                </td>
                <td className="px-4 py-2 text-right text-sm tabular-nums">
                  {formatCentavos(order.deliveryFeeCents)}
                </td>
              </tr>
            ) : null}
            <tr className="border-t border-line">
              <td colSpan={3} />
              <td className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink">
                Total
              </td>
              <td className="px-4 py-2.5 text-right text-base font-semibold tabular-nums text-ink">
                {formatCentavos(order.totalCents)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </TableShell>

      {order.notes ? (
        <Panel title="Notas">
          <p className="whitespace-pre-line text-sm text-ink">{order.notes}</p>
        </Panel>
      ) : null}
    </div>
  );
}
