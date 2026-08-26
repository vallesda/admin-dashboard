import Link from 'next/link';

import { lusitana } from '@/app/ui/fonts';
import { formatCentavos } from '@/lib/money';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/modules/sales/components/order-badges';
import { listRecentOrders } from '../queries';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/** Replaces the tutorial's "Latest Invoices" (RF-ADM-002). */
export default async function RecentOrders() {
  const orders = await listRecentOrders();

  return (
    <div className="flex w-full flex-col md:col-span-4">
      <h2 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Pedidos recientes
      </h2>
      <div className="flex grow flex-col justify-between rounded-xl bg-gray-50 p-4">
        {orders.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500">
            Todavía no hay pedidos.{' '}
            <Link
              href="/dashboard/orders/create"
              className="text-brand-600 underline"
            >
              Registra el primero
            </Link>
            .
          </p>
        ) : (
          <div className="bg-white px-6">
            {orders.map((order, i) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className={`flex flex-row items-center justify-between py-4 hover:bg-gray-50 ${
                  i !== 0 ? 'border-t' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold md:text-base">
                    #{order.orderNumber} · {order.customerName}
                  </p>
                  <p className="hidden text-sm text-gray-500 sm:block">
                    {dateFormat.format(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex sm:gap-2">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                  <p
                    className={`${lusitana.className} truncate text-sm font-medium tabular-nums md:text-base`}
                  >
                    {formatCentavos(order.totalCents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
