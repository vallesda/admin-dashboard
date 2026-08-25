import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import { toggleCategoryActive } from '../actions';

export function CreateCategory() {
  return (
    <Link
      href="/dashboard/categories/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">Crear categoría</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdateCategory({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/dashboard/categories/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      {/* The icon alone would announce as "link" to a screen reader; naming the
          category makes each row's action distinguishable in a list of links. */}
      <span className="sr-only">Editar {name}</span>
      <PencilIcon className="w-5" />
    </Link>
  );
}

/**
 * Activate / deactivate. There is no delete in the MVP: deactivating keeps the
 * `category_id` of every product that already points here.
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
      <button
        type="submit"
        className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-gray-100"
      >
        {active ? 'Desactivar' : 'Activar'}
        <span className="sr-only"> {name}</span>
      </button>
    </form>
  );
}
