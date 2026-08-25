import { Suspense } from 'react';

import { lusitana } from '@/app/ui/fonts';
import { CardsSkeleton, LatestInvoicesSkeleton } from '@/app/ui/skeletons';
import MetricCards from '@/modules/admin/components/metric-cards';
import RecentOrders from '@/modules/admin/components/recent-orders';
import LowStockList from '@/modules/admin/components/low-stock-list';

export const metadata = { title: 'Panel' };

/** Figures change with every order; a prerendered panel would be wrong at once. */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Panel
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <MetricCards />
        </Suspense>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <RecentOrders />
        </Suspense>
        <Suspense fallback={<LatestInvoicesSkeleton />}>
          <LowStockList />
        </Suspense>
      </div>
    </main>
  );
}
