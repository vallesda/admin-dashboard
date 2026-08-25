import { Suspense } from 'react';

import { lusitana } from '@/app/ui/fonts';
import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
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

  const { totalPages } = await listCustomers(query, currentPage);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Clientes</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search
          placeholder="Buscar por nombre, teléfono o correo…"
          label="Buscar clientes"
        />
        <CreateCustomer />
      </div>

      <Suspense key={query + currentPage} fallback={<InvoicesTableSkeleton />}>
        <CustomerTable query={query} currentPage={currentPage} />
      </Suspense>

      {totalPages > 1 ? (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
