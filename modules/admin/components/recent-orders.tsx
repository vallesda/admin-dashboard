import Link from 'next/link';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

import { formatCentavos } from '@/lib/money';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/modules/sales/components/order-badges';
import { listRecentOrders } from '../queries';
import Panel from '@/app/ui/kit/panel';
import EmptyState from '@/app/ui/kit/empty-state';
import { ButtonLink } from '@/app/ui/button';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/**
 * Replaces the tutorial's "Latest Invoices" (RF-ADM-002).
 *
 * The panel header carries a link to the full list. Previously the only route
 * from the dashboard to all orders was the sidebar, so the operator had to leave
 * the thing they were reading to see more of it.
 *
 * Both badges show at every width now. They were `hidden sm:flex`, which meant
 * the dashboard on a phone — the screen most likely to be checked between other
 * jobs — showed order numbers and totals with no indication of state at all,
 * which is the only reason to look at this list.
 */
export default async function RecentOrders() {
  const orders = await listRecentOrders();

  return (
    <Panel
      title="Pedidos recientes"
      actions={
        <Link
          href="/dashboard/orders"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Ver todos
        </Link>
      }
      bodyClassName=""
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="Todavía no hay pedidos"
          description="Cuando entre un pedido de la tienda aparecerá aquí."
          action={
            <ButtonLink href="/dashboard/orders/create" variant="secondary" size="sm">
              Registrar pedido
            </ButtonLink>
          }
        />
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.id} className="border-b border-line last:border-0">
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-subtle"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    <span className="tabular-nums">#{order.orderNumber}</span>
                    <span className="text-ink-subtle"> · </span>
                    {order.customerName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {dateFormat.format(order.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-medium tabular-nums text-ink">
                    {formatCentavos(order.totalCents)}
                  </span>
                  <span className="flex gap-1">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
