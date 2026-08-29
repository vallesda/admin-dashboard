import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

import { listLowStock } from '../queries';
import Panel from '@/app/ui/kit/panel';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';

/**
 * Products that need restocking (RF-INV-008).
 *
 * Replaces the tutorial's revenue chart, which plotted a hardcoded `revenue`
 * table nobody wrote to.
 *
 * The empty state is a *good* outcome and now says so, with a check rather than
 * the same grey sentence an error would produce. "Ningún producto está por
 * debajo de su umbral" read as an absence of data; it is actually the state the
 * shop wants to be in.
 */
export default async function LowStockList() {
  const items = await listLowStock();

  return (
    <Panel
      title="Bajo stock"
      actions={
        <Link
          href="/dashboard/inventory?low=1"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Ver inventario
        </Link>
      }
      bodyClassName=""
    >
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title="Todo por encima del umbral"
          description="Ningún producto activo necesita resurtido ahora mismo."
        />
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.productId} className="border-b border-line last:border-0">
              <Link
                href={`/dashboard/inventory/${item.productId}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-subtle"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">
                    {item.sku}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* The threshold is what makes the number mean something:
                      "2 disp." is only alarming next to "umbral 5". */}
                  <span className="text-xs tabular-nums text-ink-muted">
                    umbral {item.lowStockThreshold}
                  </span>
                  <Badge tone="warn">
                    <span className="tabular-nums">{item.available}</span> disp.
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
