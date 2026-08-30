'use client';

/*
 * A Client Component because its buttons submit through `ActionRunner`, which
 * hands a `pending` flag to a render prop — and a function cannot cross the
 * server/client boundary.
 */

import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { togglePackageActive, removePackageItem } from '../actions';
import { Button, ButtonLink } from '@/app/ui/button';
import ActionRunner from '@/app/ui/kit/action-runner';

export function CreatePackage() {
  return (
    <ButtonLink href="/dashboard/packages/create">
      <PlusIcon className="h-4 w-4" />
      Crear paquete
    </ButtonLink>
  );
}

export function EditPackage({ id, name }: { id: string; name: string }) {
  return (
    <ButtonLink
      href={`/dashboard/packages/${id}/edit`}
      variant="ghost"
      size="icon"
    >
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="h-4 w-4" aria-hidden="true" />
    </ButtonLink>
  );
}

/**
 * Publish / unpublish.
 *
 * There is no delete: a package can be referenced from a shopper's open tab and
 * unpublishing removes it from the storefront without breaking anything. It
 * mirrors how categories work, and for the same reason.
 */
export function TogglePackage({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  return (
    <ActionRunner action={togglePackageActive.bind(null, id, !active)}>
      {(pending, run) => (
        <Button
          type="button"
          onClick={run}
          variant="secondary"
          size="sm"
          disabled={pending}
        >
          {active ? 'Despublicar' : 'Publicar'}
          <span className="sr-only"> {name}</span>
        </Button>
      )}
    </ActionRunner>
  );
}

export function RemoveItem({
  packageId,
  productId,
  name,
}: {
  packageId: string;
  productId: string;
  name: string;
}) {
  return (
    <ActionRunner action={removePackageItem.bind(null, packageId, productId)}>
      {(pending, run) => (
        <Button
          type="button"
          onClick={run}
          variant="ghost"
          size="icon"
          disabled={pending}
        >
          <span className="sr-only">Quitar {name} del paquete</span>
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </ActionRunner>
  );
}
