import { Suspense } from 'react';

import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import CustomerTable from '@/modules/customers/components/customer-table';
import { CreateCustomer } from '@/modules/customers/components/buttons';
import { listCustomers } from '@/modules/customers/queries';

export const metadata = { title: 'Clientes' };

export const dynamic = 'force-dynamic';

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;

  const { totalPages, total } = await listCustomers(query, currentPage);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description="Quién ha comprado. El teléfono es el dato que la pescadería usa para confirmar cada pedido."
        actions={<CreateCustomer />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Search
          placeholder="Buscar por nombre, teléfono o correo…"
          label="Buscar clientes"
        />
        <p className="text-xs tabular-nums text-ink-muted">
          {total} {total === 1 ? 'cliente' : 'clientes'}
        </p>
      </div>

      <Suspense key={query + currentPage} fallback={<TableSkeleton />}>
        <CustomerTable query={query} currentPage={currentPage} />
      </Suspense>

      {totalPages > 1 ? <Pagination totalPages={totalPages} /> : null}
    </div>
  );
}
