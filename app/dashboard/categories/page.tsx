import { Suspense } from 'react';

import { lusitana } from '@/app/ui/fonts';
import { TableRowSkeleton } from '@/app/ui/skeletons';
import CategoryTable from '@/modules/catalog/components/category-table';
import { CreateCategory } from '@/modules/catalog/components/buttons';

export const metadata = { title: 'Categorías' };

/**
 * Rendered per request.
 *
 * Without this the page prerenders at build time and the list goes stale: our
 * own actions call `revalidatePath`, but a change made anywhere else (a seed, a
 * migration, another admin's deploy-time state) would never show. An admin CRUD
 * list showing yesterday's data is worse than a few milliseconds of latency.
 */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Categorías</h1>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 md:mt-8">
        <CreateCategory />
      </div>
      {/* The table fetches its own data, so it streams behind this boundary
          while the page shell renders immediately. */}
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoryTable />
      </Suspense>
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="hidden min-w-full text-gray-900 md:table">
            <TableRowSkeleton />
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
