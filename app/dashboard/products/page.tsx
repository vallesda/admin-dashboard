import { Suspense } from 'react';

import { lusitana } from '@/app/ui/fonts';
import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
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
  const { totalPages } = await listProducts(query, currentPage);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Productos</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Buscar por nombre o SKU…" label="Buscar productos" />
        <CreateProduct />
      </div>

      {/* The key remounts the boundary on every search or page change, so the
          skeleton reappears instead of showing stale rows. */}
      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <ProductTable query={query} currentPage={currentPage} />
      </Suspense>

      {totalPages > 1 ? (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
