import {
  PencilIcon,
  PlusIcon,
  CheckIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';

import type { ProductStatus } from '@/db/schema/catalog';
import { changeProductStatus } from '../actions';
import { Button, ButtonLink } from '@/app/ui/button';

export function CreateProduct() {
  return (
    <ButtonLink href="/dashboard/products/create">
      <PlusIcon className="h-4 w-4" />
      Crear producto
    </ButtonLink>
  );
}

export function UpdateProduct({ id, name }: { id: string; name: string }) {
  return (
    <ButtonLink
      href={`/dashboard/products/${id}/edit`}
      variant="ghost"
      size="icon"
    >
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="h-4 w-4" aria-hidden="true" />
    </ButtonLink>
  );
}

/**
 * Lifecycle actions for one product row.
 *
 * Only renders transitions the service would accept (INV-PRO-05), so the UI
 * never offers a button that is going to be rejected. In particular `archived`
 * offers "Volver a borrador" and never a direct "Activar" — reactivating is
 * deliberately a two-step act.
 *
 * All three transitions are `secondary`. Archiving was briefly `danger`-toned to
 * separate it from "Activar", and on a catalogue where every product is active
 * that painted a red button onto every single row — the loudest colour in the
 * panel spent on its most ordinary state, which is precisely the mistake the
 * status badges were rebuilt to avoid. Archiving is also reversible: the
 * archived row offers "Volver a borrador". A neutral button with an explicit
 * verb is the honest weight for it.
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
    <div className="flex gap-1.5">
      {status === 'draft' && (
        <StatusButton id={id} name={name} next="active" label="Activar">
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
        </StatusButton>
      )}

      {status === 'active' && (
        <StatusButton id={id} name={name} next="archived" label="Archivar">
          <ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" />
        </StatusButton>
      )}

      {status === 'archived' && (
        <StatusButton
          id={id}
          name={name}
          next="draft"
          label="Volver a borrador"
        >
          <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
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
      <Button type="submit" variant="secondary" size="sm">
        {children}
        {label}
        <span className="sr-only"> {name}</span>
      </Button>
    </form>
  );
}
