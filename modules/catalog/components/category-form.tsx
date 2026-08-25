'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { LinkIcon, TagIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import { createCategory, updateCategory } from '../actions';
import {
  emptyCategoryFormState,
  type CategoryFormState,
} from '../form-state';
import type { CategoryListItem } from '../queries';

type Props = {
  /** Present when editing; absent when creating. */
  category?: CategoryListItem;
};

/**
 * Create/edit form for a Category.
 *
 * One component for both modes: the fields are identical and keeping them in
 * two files guarantees they drift (which is exactly what happened to the
 * invoice create/edit pair).
 *
 * Unlike `app/ui/invoices/create-form.tsx`, this form actually renders
 * `state.errors` and `state.message` — that file destructures them and never
 * paints them, so its validation is invisible to the user (DT-001).
 */
export default function CategoryForm({ category }: Props) {
  const isEdit = category !== undefined;

  const action = isEdit
    ? updateCategory.bind(null, category.id)
    : createCategory;

  const [state, formAction, isPending] = useActionState<
    CategoryFormState,
    FormData
  >(action, emptyCategoryFormState);

  return (
    <form action={formAction}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* Nombre */}
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Nombre de la categoría
          </label>
          <div className="relative">
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={category?.name}
              placeholder="Pescado fresco"
              required
              minLength={2}
              maxLength={120}
              aria-describedby="name-error"
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
            />
            <TagIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
          </div>
          <FieldError id="name-error" messages={state.errors?.name} />
        </div>

        {/* Slug */}
        <div className="mb-4">
          <label htmlFor="slug" className="mb-2 block text-sm font-medium">
            URL {!isEdit && <span className="text-gray-500">(opcional)</span>}
          </label>
          <div className="relative">
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={category?.slug}
              placeholder="pescado-fresco"
              maxLength={140}
              required={isEdit}
              aria-describedby="slug-error slug-help"
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
            />
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
          </div>
          <p id="slug-help" className="mt-1 text-xs text-gray-500">
            {isEdit
              ? 'Cambiarla rompe los enlaces que ya apunten a esta categoría.'
              : 'Si la dejas vacía se genera a partir del nombre.'}
          </p>
          <FieldError id="slug-error" messages={state.errors?.slug} />
        </div>

        {/* Orden */}
        <div className="mb-4">
          <label htmlFor="sortOrder" className="mb-2 block text-sm font-medium">
            Orden
          </label>
          <div className="relative">
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              step="1"
              min="0"
              max="9999"
              defaultValue={category?.sortOrder ?? 0}
              aria-describedby="sortOrder-error sortOrder-help"
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
            />
            <Bars3BottomLeftIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
          </div>
          <p id="sortOrder-help" className="mt-1 text-xs text-gray-500">
            Menor número aparece primero.
          </p>
          <FieldError id="sortOrder-error" messages={state.errors?.sortOrder} />
        </div>

        {/* Activa */}
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">
            Visibilidad
          </legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex items-center">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={category?.active ?? true}
                aria-describedby="active-error"
                className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
              />
              <label
                htmlFor="active"
                className="ml-2 cursor-pointer text-sm text-gray-600"
              >
                Categoría activa
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Una categoría inactiva no se puede asignar a productos nuevos ni
              aparece en la tienda.
            </p>
          </div>
          <FieldError id="active-error" messages={state.errors?.active} />
        </fieldset>

        {/* Error de formulario, no de campo */}
        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p className="mt-4 text-sm text-red-500">{state.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/categories"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancelar
        </Link>
        <Button type="submit" aria-disabled={isPending}>
          {isPending
            ? 'Guardando…'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear categoría'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Field-level errors.
 *
 * `aria-live="polite"` announces the message when it appears without stealing
 * focus, and the container is always rendered so screen readers have a region
 * to watch — a region that only appears on error is announced inconsistently.
 */
function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  return (
    <div id={id} aria-live="polite" aria-atomic="true">
      {messages?.map((message) => (
        <p className="mt-2 text-sm text-red-500" key={message}>
          {message}
        </p>
      ))}
    </div>
  );
}
