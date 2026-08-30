import Link from 'next/link';
import { ClockIcon } from '@heroicons/react/24/outline';

import Panel from '@/app/ui/kit/panel';
import EmptyState from '@/app/ui/kit/empty-state';
import { formatCentavos } from '@/lib/money';
import { ORDER_STATUS_LABEL } from '@/modules/sales/state-machine';
import { staleHolds } from '../sweeper';
import type { OrderStatus } from '@/db/schema/sales';

const HOURS = 24;

const relative = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' });

/**
 * Counter orders that have been holding stock for more than a day.
 *
 * This is the human half of DOCS/PAGOS.md §10. Online orders whose payment
 * never arrived are cancelled by the scheduled sweep, because the counterparty
 * there is a machine and an expired session is a verifiable fact. These are
 * different: somebody said they would come. The panel says which promises are
 * getting old and leaves the decision to a person — cancelling automatically
 * would be cheaper and would cost the shop the customer who turned up late.
 */
export default async function StaleHoldsList() {
  const rows = await staleHolds(HOURS);

  return (
    <Panel
      title="Apartados desde hace tiempo"
      description={`Pedidos por cobrar en mostrador que llevan más de ${HOURS} h reservando producto.`}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={ClockIcon}
          title="Nada apartado de más"
          description="Ningún pedido lleva más de un día esperando a que lo recojan."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id}>
                <Link
                  href={`/dashboard/orders/${row.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-subtle"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      #{row.orderNumber} · {row.customerName}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {ORDER_STATUS_LABEL[row.status as OrderStatus]} ·{' '}
                      {/* Stated in hours or days rather than a date: what the
                          counter needs is how long this has been waiting, not
                          when it started. */}
                      {row.heldForHours < 48
                        ? relative.format(-row.heldForHours, 'hour')
                        : relative.format(-Math.floor(row.heldForHours / 24), 'day')}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                    {formatCentavos(row.totalCents)}
                  </span>
                </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
