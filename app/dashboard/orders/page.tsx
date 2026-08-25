import { Suspense } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { PlusIcon } from '@heroicons/react/24/outline';

import { lusitana } from '@/app/ui/fonts';
import Search from '@/app/ui/search';
import Pagination from '@/app/ui/invoices/pagination';
import { InvoicesTableSkeleton } from '@/app/ui/skeletons';
import OrderTable from '@/modules/sales/components/order-table';
import { listOrders } from '@/modules/sales/queries';
import { ORDER_STATUS_LABEL } from '@/modules/sales/state-machine';
import type { OrderStatus } from '@/db/schema/sales';

export const metadata = { title: 'Pedidos' };

export const dynamic = 'force-dynamic';

const FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

function isStatus(value?: string): value is OrderStatus {
  return (
    value !== undefined && value !== 'all' && FILTERS.includes(value as OrderStatus)
  );
}

export default async function Page(props: {
  searchParams?: Promise<{ query?: string; page?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = isStatus(searchParams?.status)
    ? searchParams.status
    : undefined;

  const { totalPages } = await listOrders(query, currentPage, status);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className={`${lusitana.className} text-2xl`}>Pedidos</h1>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search
          placeholder="Buscar por número, cliente o teléfono…"
          label="Buscar pedidos"
        />
        <Link
          href="/dashboard/orders/create"
          className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <span className="hidden md:block">Registrar pedido</span>
          <PlusIcon className="h-5 md:ml-4" />
        </Link>
      </div>

      {/* Filter state in the URL, like the search: a filtered view is
          shareable and survives a reload. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f === 'all' ? status === undefined : status === f;
          const href =
            f === 'all' ? '/dashboard/orders' : `/dashboard/orders?status=${f}`;

          return (
            <Link
              key={f}
              href={href}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {f === 'all' ? 'Todos' : ORDER_STATUS_LABEL[f]}
            </Link>
          );
        })}
      </div>

      <Suspense
        key={`${query}${currentPage}${status ?? 'all'}`}
        fallback={<InvoicesTableSkeleton />}
      >
        <OrderTable query={query} currentPage={currentPage} status={status} />
      </Suspense>

      {totalPages > 1 ? (
        <div className="mt-5 flex w-full justify-center">
          <Pagination totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
