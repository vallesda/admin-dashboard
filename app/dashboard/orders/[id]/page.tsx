import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
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

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const order = await getOrderById(id);

  if (!order) notFound();

  return (
    <main>
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="text-sm text-gray-500">
          {dateFormat.format(order.createdAt)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contacto: la copia guardada en el pedido, no la ficha actual */}
        <section className="rounded-md bg-gray-50 p-4 md:p-6">
          <h2 className="mb-3 text-sm font-medium">Cliente</h2>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-sm text-gray-500">{order.customerPhone}</p>
          {order.customerEmail ? (
            <p className="text-sm text-gray-500">{order.customerEmail}</p>
          ) : null}
          <p className="mt-3 text-sm">
            {order.fulfillmentType === 'delivery'
              ? 'Entrega a domicilio'
              : 'Recoge en tienda'}
          </p>
          {order.deliveryAddress ? (
            <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500">
            Estos datos son la copia guardada al registrar el pedido. Editar la
            ficha del cliente no los cambia.
          </p>
        </section>

        <section className="rounded-md bg-gray-50 p-4 md:p-6">
          <h2 className="mb-3 text-sm font-medium">Estado del pedido</h2>
          <OrderStatusActions orderId={order.id} status={order.status} />
          {order.completedAt ? (
            <p className="mt-3 text-xs text-gray-500">
              Completado el {dateFormat.format(order.completedAt)}
            </p>
          ) : null}
          {order.cancelledAt ? (
            <p className="mt-3 text-xs text-gray-500">
              Cancelado el {dateFormat.format(order.cancelledAt)}
            </p>
          ) : null}
        </section>

        <section className="rounded-md bg-gray-50 p-4 md:p-6">
          <h2 className="mb-3 text-sm font-medium">Pago</h2>
          <PaymentStatusActions
            orderId={order.id}
            paymentStatus={order.paymentStatus}
          />
          <p className="mt-3 text-xs text-gray-500">
            El pago es independiente del estado del pedido.
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-lg bg-gray-50 p-2">
        <table className="min-w-full text-gray-900">
          <thead className="text-left text-sm font-normal">
            <tr>
              <th scope="col" className="px-4 py-4 font-medium">
                Producto
              </th>
              <th scope="col" className="px-3 py-4 font-medium">
                SKU
              </th>
              <th scope="col" className="px-3 py-4 text-right font-medium">
                Precio
              </th>
              <th scope="col" className="px-3 py-4 text-right font-medium">
                Cantidad
              </th>
              <th scope="col" className="px-3 py-4 text-right font-medium">
                Importe
              </th>
            </tr>
          </thead>
          <tbody className="bg-white text-sm">
            {order.items.map((item) => (
              <tr key={item.id} className="border-b last-of-type:border-none">
                <td className="px-4 py-3">{item.productName}</td>
                <td className="px-3 py-3 font-mono text-gray-500">
                  {item.sku}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatCentavos(item.unitPriceCents)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatCentavos(item.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-1 bg-white p-4 text-sm">
          <Row label="Subtotal" value={formatCentavos(order.subtotalCents)} />
          {order.deliveryFeeCents > 0 ? (
            <Row label="Envío" value={formatCentavos(order.deliveryFeeCents)} />
          ) : null}
          <div className="border-t pt-1">
            <Row label="Total" value={formatCentavos(order.totalCents)} bold />
          </div>
        </div>
      </section>

      {order.notes ? (
        <section className="mt-6 rounded-md bg-gray-50 p-4">
          <h2 className="mb-1 text-sm font-medium">Notas</h2>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </section>
      ) : null}
    </main>
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
