'use client';

/*
 * A Client Component: `Can` reads the role from context, and the buttons that
 * run an action hand a `pending` flag to a render prop.
 */

import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

import { ButtonLink } from '@/app/ui/button';
import { Can } from '@/app/ui/kit/role';

export function CreateUser() {
  return (
    <Can role="owner">
      <ButtonLink href="/dashboard/users/create">
        <PlusIcon className="h-4 w-4" />
        Crear cuenta
      </ButtonLink>
    </Can>
  );
}

export function EditUser({ id, name }: { id: string; name: string }) {
  return (
    <Can role="owner">
      <ButtonLink
        href={`/dashboard/users/${id}/edit`}
        variant="ghost"
        size="icon"
      >
        <span className="sr-only">Editar {name}</span>
        <PencilIcon className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </Can>
  );
}
