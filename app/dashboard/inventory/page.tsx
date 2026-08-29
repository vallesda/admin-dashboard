import { Suspense } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
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

  const [{ totalPages, total }, lowCount] = await Promise.all([
    listInventory(query, currentPage, lowOnly),
    countLowStock(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventario"
        description="Disponible es lo que la tienda puede vender: en mano menos lo reservado por pedidos abiertos."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Search
          placeholder="Buscar por nombre o SKU…"
          label="Buscar en inventario"
        />

        {/*
          Filter state lives in the URL like the search, so a filtered view is
          shareable and survives a reload.

          It is a toggle with `aria-pressed` rather than two differently
          coloured links. Previously the "on" state was an amber pill and the
          "off" state a grey one, which read as two unrelated buttons rather
          than one control in two states — and the label changed too ("Solo bajo
          stock" / "Ver todo"), so nothing stayed constant to anchor it.
        */}
        <Link
          href={lowOnly ? '/dashboard/inventory' : '/dashboard/inventory?low=1'}
          aria-pressed={lowOnly}
          role="button"
          className={clsx(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
            lowOnly
              ? 'border-warn/50 bg-warn-soft text-warn'
              : 'border-line-strong bg-surface text-ink hover:bg-subtle',
          )}
        >
          <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
          Solo bajo stock
          <span className="tabular-nums opacity-70">({lowCount})</span>
        </Link>

        <p className="ml-auto text-xs tabular-nums text-ink-muted">
          {total} {total === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      <Suspense
        key={`${query}${currentPage}${lowOnly}`}
        fallback={<TableSkeleton />}
      >
        <InventoryTable
          query={query}
          currentPage={currentPage}
          lowOnly={lowOnly}
        />
      </Suspense>

      {totalPages > 1 ? <Pagination totalPages={totalPages} /> : null}
    </div>
  );
}
