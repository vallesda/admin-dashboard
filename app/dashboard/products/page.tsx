import { Suspense } from 'react';

import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import ProductTable from '@/modules/catalog/components/product-table';
import { CreateProduct } from '@/modules/catalog/components/product-buttons';
import { listProducts } from '@/modules/catalog/queries';

export const metadata = { title: 'Productos' };

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;

  // Needed by <Pagination> before the shell renders, so it is awaited here
  // rather than inside the Suspense boundary. The count costs one extra query;
  // the table's own read is a separate one that streams.
  const { totalPages, total } = await listProducts(query, currentPage);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Productos"
        description="El catálogo que ve la tienda. Un producto en borrador no aparece en línea."
        actions={<CreateProduct />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Search placeholder="Buscar por nombre o SKU…" label="Buscar productos" />
        {/*
          The count is stated rather than left to be inferred from the rows.
          On a paginated list "23 productos" is the only place the operator can
          see the size of what they are working through.
        */}
        <p className="text-xs tabular-nums text-ink-muted">
          {total} {total === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {/* The key remounts the boundary on every search or page change, so the
          skeleton reappears instead of showing stale rows. */}
      <Suspense key={query + currentPage} fallback={<TableSkeleton />}>
        <ProductTable query={query} currentPage={currentPage} />
      </Suspense>

      {totalPages > 1 ? <Pagination totalPages={totalPages} /> : null}
    </div>
  );
}
