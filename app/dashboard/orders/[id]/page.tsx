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
import { OrderStatusActions } from '@/modules/sales/components/order-actions';
import MoneyPanel from '@/modules/payments/components/money-panel';
import { moneySummary } from '@/modules/payments/queries';

export const metadata = { title: 'Detalle de pedido' };

export const dynamic = 'force-dynamic';

/** Por qué el envío costó lo que costó, en la voz del mostrador. */
const FEE_REASON_LABEL: Record<string, string> = {
  zone: 'tarifa de zona',
  free_over_threshold: 'gratis por monto',
  waived: 'perdonado',
  none: '',
};

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

  /*
   * Read here rather than inside the buttons: the gates need the same two
   * numbers the money panel shows, and fetching them twice would let the
   * heading and the actions disagree about how much is owed.
   */
  const money = await moneySummary(order.id);
  const outstandingCents = Math.max(0, order.totalCents - money.paidCents);
  const heldCents = Math.max(0, money.paidCents - money.refundedCents);

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
          {/* Un encargo cambia lo que el mostrador tiene que hacer: no preparar
              hoy, sino comprar para esa fecha. Va junto a la entrega porque es
              donde se lee «qué hay que hacer con este pedido». */}
          {order.promisedFor ? (
            <p className="mt-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-ink">
              <span className="font-medium">Por encargo:</span> llega el{' '}
              {dateFormat.format(order.promisedFor)}
            </p>
          ) : null}

          {/*
            The parts when they exist, the old one-line snapshot when they do
            not. Orders placed before addresses were structured keep the
            sentence they were written with — parsing one into a street and a
            postal code would be inventing data.
          */}
          {order.deliveryStreet ? (
            <address className="mt-0.5 not-italic text-sm text-ink-muted">
              <span className="block">
                {order.deliveryStreet} {order.deliveryExtNumber}
                {order.deliveryIntNumber ? `, Int. ${order.deliveryIntNumber}` : ''}
              </span>
              <span className="block">
                Col. {order.deliveryNeighborhood} · C.P. {order.deliveryPostalCode}
              </span>
              <span className="block">
                {order.deliveryCity}, {order.deliveryState}
              </span>
              {order.deliveryReferences ? (
                <span className="mt-1 block text-ink">
                  Referencias: {order.deliveryReferences}
                </span>
              ) : null}
            </address>
          ) : order.deliveryAddress ? (
            <p className="mt-0.5 text-sm text-ink-muted">
              {order.deliveryAddress}
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Estado del pedido"
          description="Cumplimiento: qué falta para entregarlo."
        >
          <OrderStatusActions
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            paymentMode={order.paymentMode}
            outstandingCents={outstandingCents}
            heldCents={heldCents}
          />
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
          description={
            order.paymentMode === 'online'
              ? 'Se cobra en línea. El libro de abajo es lo que decide el estado.'
              : 'Se cobra al recibir. El libro de abajo es lo que decide el estado.'
          }
        >
          <MoneyPanel
            orderId={order.id}
            totalCents={order.totalCents}
            paymentStatus={order.paymentStatus}
            paymentMode={order.paymentMode}
            isClosed={
              order.status === 'cancelled' || order.status === 'completed'
            }
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
            {/*
              El envío se muestra siempre que aplique, aunque valga cero.
              
              Un cero omitido y un envío que no aplica se ven igual, y no lo
              son: uno significa «se lo regalamos» y el otro «lo recoge él».
              Al lado va **por qué** costó lo que costó, porque el importe solo
              no distingue entre la promoción por monto y una exención que
              alguien decidió y tuvo que justificar.
            */}
            {order.deliveryFeeReason !== 'none' ? (
              <tr>
                <td colSpan={3} />
                <td className="px-4 py-2 text-right text-xs uppercase tracking-wider text-ink-muted">
                  Envío
                  {order.deliveryZoneName ? (
                    <span className="block font-normal normal-case tracking-normal text-ink-subtle">
                      {order.deliveryZoneName} · {FEE_REASON_LABEL[order.deliveryFeeReason]}
                    </span>
                  ) : null}
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

      {/* La razón escrita de una exención vive junto al pedido, no en un log:
          es la frase que alguien va a tener que justificar meses después. */}
      {order.deliveryFeeNote ? (
        <p className="rounded-md border border-line bg-subtle px-3.5 py-2.5 text-sm text-ink-muted">
          <span className="font-medium text-ink">Envío perdonado:</span>{' '}
          {order.deliveryFeeNote}
        </p>
      ) : null}

      {order.notes ? (
        <Panel title="Notas">
          <p className="whitespace-pre-line text-sm text-ink">{order.notes}</p>
        </Panel>
      ) : null}
    </div>
  );
}
