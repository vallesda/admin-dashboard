import Link from 'next/link';
import { TruckIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

import { formatCentavos } from '@/lib/money';
import { listOrders } from '../queries';
import { OrderStatusBadge, PaymentStatusBadge } from './order-badges';
import type { OrderStatus } from '@/db/schema/sales';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

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
      <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          {query
            ? `No hay pedidos que coincidan con “${query}”.`
            : 'Todavía no hay pedidos.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Mobile */}
          <div className="md:hidden">
            {items.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="mb-2 block w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">
                      Pedido #{order.orderNumber}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {order.customerName}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <p className="text-xl font-medium tabular-nums">
                    {formatCentavos(order.totalCents)}
                  </p>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop */}
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Pedido
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Entrega
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Piezas
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Total
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Pago
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((order) => (
                <tr
                  key={order.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3 font-medium tabular-nums">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p>{order.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {order.customerPhone}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      {order.fulfillmentType === 'delivery' ? (
                        <>
                          <TruckIcon className="w-4" /> Domicilio
                        </>
                      ) : (
                        <>
                          <ShoppingBagIcon className="w-4" /> Recoge
                        </>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-gray-500">
                    {order.itemCount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatCentavos(order.totalCents)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    {dateFormat.format(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
