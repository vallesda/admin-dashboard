import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

import { ButtonLink } from '@/app/ui/button';

export function CreateCustomer() {
  return (
    <ButtonLink href="/dashboard/customers/create">
      <PlusIcon className="h-4 w-4" />
      Crear cliente
    </ButtonLink>
  );
}

export function UpdateCustomer({ id, name }: { id: string; name: string }) {
  return (
    <ButtonLink
      href={`/dashboard/customers/${id}/edit`}
      variant="ghost"
      size="icon"
    >
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="h-4 w-4" aria-hidden="true" />
    </ButtonLink>
  );
}
