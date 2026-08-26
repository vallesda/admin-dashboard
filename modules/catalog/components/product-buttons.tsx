import {
  PencilIcon,
  PlusIcon,
  CheckIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

import type { ProductStatus } from '@/db/schema/catalog';
import { changeProductStatus } from '../actions';

export function CreateProduct() {
  return (
    <Link
      href="/dashboard/products/create"
      className="flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <span className="hidden md:block">Crear producto</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdateProduct({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/dashboard/products/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="w-5" />
    </Link>
  );
}

/**
 * Lifecycle actions for one product row.
 *
 * Only renders transitions the service would accept (INV-PRO-05), so the UI
 * never offers a button that is going to be rejected. In particular `archived`
 * offers "Volver a borrador" and never a direct "Activar" — reactivating is
 * deliberately a two-step act.
 */
export function ProductStatusActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: ProductStatus;
}) {
  return (
    <div className="flex gap-2">
      {status === 'draft' && (
        <StatusButton id={id} name={name} next="active" label="Activar">
          <CheckIcon className="w-4" />
        </StatusButton>
      )}

      {status === 'active' && (
        <StatusButton id={id} name={name} next="archived" label="Archivar">
          <ArchiveBoxIcon className="w-4" />
        </StatusButton>
      )}

      {status === 'archived' && (
        <StatusButton
          id={id}
          name={name}
          next="draft"
          label="Volver a borrador"
        >
          <ArrowUturnLeftIcon className="w-4" />
        </StatusButton>
      )}
    </div>
  );
}

function StatusButton({
  id,
  name,
  next,
  label,
  children,
}: {
  id: string;
  name: string;
  next: ProductStatus;
  label: string;
  children: React.ReactNode;
}) {
  const change = changeProductStatus.bind(null, id, next);

  return (
    <form action={change}>
      <button
        type="submit"
        className="flex items-center gap-1 whitespace-nowrap rounded-md border px-3 py-2 text-xs font-medium hover:bg-gray-100"
      >
        {children}
        {label}
        <span className="sr-only"> {name}</span>
      </button>
    </form>
  );
}
