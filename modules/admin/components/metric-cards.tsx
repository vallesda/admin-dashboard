import {
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import clsx from 'clsx';

import { formatCentavos } from '@/lib/money';
import { getDashboardMetrics } from '../queries';

/**
 * The day's headline figures, from Orders and Inventory (RF-ADM-003).
 *
 * These were the tutorial's stat-card template: a grey `rounded-xl` tray holding
 * a white box, the figure centred at `text-2xl` with `py-8` of air above and
 * below it, and a serif face on the number. Four of them across the top of the
 * screen took roughly 200px of vertical space to deliver four integers, and
 * pushed the two lists that an operator actually works from below the fold.
 *
 * They are now left-aligned tiles about half the height. Left-aligned because
 * four centred numbers in a row have no common edge, so comparing them means
 * four separate fixations; on a shared left margin the eye reads straight down.
 *
 * The alert state is a border and an icon colour, not a filled red card. A tile
 * that floods when stock is low would be the loudest thing on the dashboard for
 * a condition that is often just "the pulpo is nearly out", and the operator
 * would learn to ignore it within a week.
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
        hint={
          m.lowStockCount > 0 ? 'Requieren resurtido' : 'Todo por encima del umbral'
        }
        alert={m.lowStockCount > 0}
      />
      <Card
        title="Sin pagar"
        value={m.unpaidOrders}
        icon={ClockIcon}
        href="/dashboard/orders"
        hint="Pendientes de cobro"
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
      className={clsx(
        'group rounded-lg border bg-surface p-3.5 transition-colors',
        alert
          ? 'border-warn/40 hover:border-warn'
          : 'border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={clsx(
            'h-4 w-4 shrink-0',
            alert ? 'text-warn' : 'text-ink-subtle',
          )}
          aria-hidden="true"
        />
        <h3 className="truncate text-xs font-medium uppercase tracking-wider text-ink-muted">
          {title}
        </h3>
      </div>

      {/*
        `tabular-nums` and a fixed leading so the four figures share a baseline
        even when one is "$12,480.00" and its neighbour is "3".
      */}
      <p className="mt-2 truncate text-2xl font-semibold leading-8 tracking-tight tabular-nums text-ink">
        {value}
      </p>

      {hint ? (
        <p className="mt-1 truncate text-xs text-ink-muted">{hint}</p>
      ) : null}
    </Link>
  );
}
