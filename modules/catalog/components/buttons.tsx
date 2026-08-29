import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

import { toggleCategoryActive } from '../actions';
import { Button, ButtonLink } from '@/app/ui/button';

export function CreateCategory() {
  return (
    <ButtonLink href="/dashboard/categories/create">
      <PlusIcon className="h-4 w-4" />
      Crear categoría
    </ButtonLink>
  );
}

export function UpdateCategory({ id, name }: { id: string; name: string }) {
  return (
    <ButtonLink
      href={`/dashboard/categories/${id}/edit`}
      variant="ghost"
      size="icon"
    >
      {/* The icon alone would announce as "link" to a screen reader; naming the
          category makes each row's action distinguishable in a list of links. */}
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="h-4 w-4" aria-hidden="true" />
    </ButtonLink>
  );
}

/**
 * Activate / deactivate. There is no delete in the MVP: deactivating keeps the
 * `category_id` of every product that already points here.
 *
 * Deactivating is the one that hides a category from the storefront, so it takes
 * the `danger` tone while activating stays neutral — the two used to be the same
 * grey button whose only difference was its label.
 */
export function ToggleCategory({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const toggle = toggleCategoryActive.bind(null, id, !active);

  return (
    <form action={toggle}>
      <Button type="submit" variant={active ? 'danger' : 'secondary'} size="sm">
        {active ? 'Desactivar' : 'Activar'}
        <span className="sr-only"> {name}</span>
      </Button>
    </form>
  );
}
