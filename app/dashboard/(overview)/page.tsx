import { Suspense } from 'react';

import { StatsSkeleton, PanelListSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import MetricCards from '@/modules/admin/components/metric-cards';
import RecentOrders from '@/modules/admin/components/recent-orders';
import LowStockList from '@/modules/admin/components/low-stock-list';
import StaleHoldsList from '@/modules/payments/components/stale-holds-list';

export const metadata = { title: 'Panel' };

/** Figures change with every order; a prerendered panel would be wrong at once. */
export const dynamic = 'force-dynamic';

/**
 * The dashboard.
 *
 * Four figures, then the two lists that are actually worked from. The old
 * layout put the lists in a `md:grid-cols-4 lg:grid-cols-8` grid whose children
 * each claimed `md:col-span-4` — which at the `lg` breakpoint left half the row
 * empty, so on the widest screens the two panels sat side by side in the left
 * half of the page with a void beside them.
 *
 * They are a plain two-column split now, stacking below `xl` because at 1280px
 * a two-column order list truncates the customer names that make it useful.
 */
export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Panel"
        description="Lo que necesita atención hoy: pedidos abiertos, cobros pendientes y producto por resurtir."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Suspense fallback={<StatsSkeleton />}>
          <MetricCards />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Suspense fallback={<PanelListSkeleton />}>
          <RecentOrders />
        </Suspense>
        <Suspense fallback={<PanelListSkeleton />}>
          <LowStockList />
        </Suspense>
        {/*
          Third panel, below the other two. Stock held for orders nobody has
          come for is the same class of problem as stock running out — both are
          "producto que no está donde debería" — so it belongs on this screen
          rather than buried in the order list (DOCS/PAGOS.md §10).
        */}
        <Suspense fallback={<PanelListSkeleton />}>
          <StaleHoldsList />
        </Suspense>
      </div>
    </div>
  );
}
