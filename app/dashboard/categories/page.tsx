import { Suspense } from 'react';

import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Categorías"
        description="Agrupan el catálogo en la tienda. Desactivar una la oculta sin perder los productos que apuntan a ella."
        actions={<CreateCategory />}
      />

      {/* The table fetches its own data, so it streams behind this boundary
          while the page shell renders immediately. */}
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <CategoryTable />
      </Suspense>
    </div>
  );
}
