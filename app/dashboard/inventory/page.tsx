import { Suspense } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { lusitana } from '@/app/ui/fonts';
import Search from '@/app/ui/search';
import Pagination from '@/app/ui/invoices/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
import InventoryTable from '@/modules/inventory/components/inventory-table';
import { listInventory, countLowStock } from '@/modules/inventory/queries';

export const metadata = { title: 'Inventario' };

/** Stock changes constantly; a prerendered page would be wrong immediately. */
export const dynamic = 'force-dynamic';

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string; low?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const lowOnly = searchParams?.low === '1';

  const [{ totalPages }, lowCount] = await Promise.all([
    listInventory(query, currentPage, lowOnly),
    countLowStock(),
  ]);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Inventario</h1>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-8">
        <Search
          placeholder="Buscar por nombre o SKU…"
          label="Buscar en inventario"
        />
        {/* Filter state lives in the URL like the search, so a filtered view is
            shareable and survives a reload. */}
        <Link
          href={lowOnly ? '/dashboard/inventory' : '/dashboard/inventory?low=1'}
          className={clsx(
            'flex h-10 items-center whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors',
            lowOnly
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {lowOnly ? 'Ver todo' : `Solo bajo stock (${lowCount})`}
        </Link>
      </div>

      <Suspense
        key={`${query}${currentPage}${lowOnly}`}
        fallback={<InvoicesTableSkeleton />}
      >
        <InventoryTable
          query={query}
          currentPage={currentPage}
          lowOnly={lowOnly}
        />
      </Suspense>

      {totalPages > 1 ? (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
