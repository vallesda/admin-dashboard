import { Suspense } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';

import Search from '@/app/ui/shared/search';
import Pagination from '@/app/ui/shared/pagination';
import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import { ButtonLink } from '@/app/ui/button';
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

  const { totalPages, total } = await listOrders(query, currentPage, status);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pedidos"
        description="La cola de trabajo. El estado de cumplimiento y el de pago avanzan por separado."
        actions={
          <ButtonLink href="/dashboard/orders/create">
            <PlusIcon className="h-4 w-4" />
            Registrar pedido
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Search
          placeholder="Buscar por número, cliente o teléfono…"
          label="Buscar pedidos"
        />
        <p className="text-xs tabular-nums text-ink-muted">
          {total} {total === 1 ? 'pedido' : 'pedidos'}
        </p>
      </div>

      {/*
        Filter state in the URL, like the search: a filtered view is shareable
        and survives a reload.

        The tabs are a `<nav>` with `aria-current` rather than a row of
        anonymous pills. They were `bg-gray-900 text-white` when active — pure
        black, a colour used nowhere else in the panel, and the only signal that
        a filter was on. Now the active one is brand-toned AND carries
        `aria-current`, so it does not depend on colour alone.
      */}
      <nav
        aria-label="Filtrar por estado"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {FILTERS.map((f) => {
          const active = f === 'all' ? status === undefined : status === f;
          const href =
            f === 'all' ? '/dashboard/orders' : `/dashboard/orders?status=${f}`;

          return (
            <Link
              key={f}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-600'
                  : 'border-line bg-surface text-ink-muted hover:bg-subtle hover:text-ink',
              )}
            >
              {f === 'all' ? 'Todos' : ORDER_STATUS_LABEL[f]}
            </Link>
          );
        })}
      </nav>

      <Suspense
        key={`${query}${currentPage}${status ?? 'all'}`}
        fallback={<TableSkeleton />}
      >
        <OrderTable query={query} currentPage={currentPage} status={status} />
      </Suspense>

      {totalPages > 1 ? <Pagination totalPages={totalPages} /> : null}
    </div>
  );
}
