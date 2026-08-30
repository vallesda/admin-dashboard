'use client';

import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import { Button, ButtonLink } from '@/app/ui/button';
import ActionRunner from '@/app/ui/kit/action-runner';
import { Can } from '@/app/ui/kit/role';
import { deleteZone } from '../actions';

export function CreateZone() {
  return (
    <Can role="admin">
      <ButtonLink href="/dashboard/delivery/create">
        <PlusIcon className="h-4 w-4" />
        Crear zona
      </ButtonLink>
    </Can>
  );
}

export function EditZone({ id, name }: { id: string; name: string }) {
  return (
    <Can role="admin">
      <ButtonLink href={`/dashboard/delivery/${id}/edit`} variant="ghost" size="icon">
        <span className="sr-only">Editar {name}</span>
        <PencilIcon className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </Can>
  );
}

/**
 * Borrar una zona.
 *
 * Sólo funciona si ningún pedido se cobró con ella: la clave foránea lo impide
 * y el servicio traduce el rechazo a una frase que dice qué hacer en su lugar
 * (desactivarla). Por eso el botón se ofrece siempre en vez de esconderse: el
 * intento explica la regla mejor que su ausencia.
 */
export function DeleteZone({ id, name }: { id: string; name: string }) {
  return (
    <Can role="admin">
      <ActionRunner action={deleteZone.bind(null, id)}>
        {(pending, run) => (
          <Button
            type="button"
            onClick={run}
            variant="ghost"
            size="icon"
            disabled={pending}
          >
            <span className="sr-only">Eliminar {name}</span>
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </ActionRunner>
    </Can>
  );
}
