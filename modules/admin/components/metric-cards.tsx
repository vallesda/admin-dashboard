import {
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import clsx from 'clsx';

import { lusitana } from '@/app/ui/fonts';
import { formatCentavos } from '@/lib/money';
import { getDashboardMetrics } from '../queries';

/**
 * The day's headline figures, from Orders and Inventory (RF-ADM-003).
 *
 * Replaces the tutorial's cards, which read `invoices` and `revenue` — seed
 * data that had nothing to do with anything the shop actually sold.
 */
export default async function MetricCards() {
  const m = await getDashboardMetrics();

  return (
    <>
      <Card
        title="Pedidos abiertos"
        value={m.openOrders}
        icon={ClipboardDocumentListIcon}
        href="/dashboard/orders"
        hint={`${m.ordersTodayCount} registrados hoy`}
      />
      <Card
        title="Ventas de hoy"
        value={formatCentavos(m.salesTodayCents)}
        icon={BanknotesIcon}
        href="/dashboard/orders?status=completed"
        hint="Solo pedidos completados"
      />
      <Card
        title="Bajo stock"
        value={m.lowStockCount}
        icon={ExclamationTriangleIcon}
        href="/dashboard/inventory?low=1"
        alert={m.lowStockCount > 0}
      />
      <Card
        title="Sin pagar"
        value={m.unpaidOrders}
        icon={ClockIcon}
        href="/dashboard/orders"
      />
    </>
  );
}

function Card({
  title,
  value,
  icon: Icon,
  href,
  hint,
  alert = false,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  hint?: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-gray-50 p-2 shadow-sm transition-colors hover:bg-gray-100"
    >
      <div className="flex p-4">
        <Icon
          className={clsx('h-5 w-5', alert ? 'text-amber-600' : 'text-gray-700')}
        />
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <p
        className={`${lusitana.className} truncate rounded-xl bg-white px-4 py-8 text-center text-2xl tabular-nums`}
      >
        {value}
      </p>
      {hint ? (
        <p className="px-4 py-2 text-center text-xs text-gray-500">{hint}</p>
      ) : null}
    </Link>
  );
}
