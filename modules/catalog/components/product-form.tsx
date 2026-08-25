'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  TagIcon,
  LinkIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ScaleIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import { centavosToPesosInput } from '@/lib/money';
import type { ProductRow } from '@/db/schema/catalog';
import { createProduct, updateProduct } from '../actions';
import { emptyProductFormState, type ProductFormState } from '../form-state';
import type { CategoryOption } from '../queries';

type Props = {
  categories: CategoryOption[];
  /** Present when editing; absent when creating. */
  product?: ProductRow;
};

/**
 * Create/edit form for a Product.
 *
 * One component for both modes, like the Category form: keeping create and edit
 * in two files is what let the invoice pair drift apart.
 *
 * Money is typed in pesos and stored in centavos (RN-002); the conversion lives
 * in `lib/money.ts` and runs server-side inside the Zod schema, so a crafted
 * POST cannot bypass it.
 */
export default function ProductForm({ categories, product }: Props) {
  const isEdit = product !== undefined;

  const action = isEdit ? updateProduct.bind(null, product.id) : createProduct;

  const [state, formAction, isPending] = useActionState<
    ProductFormState,
    FormData
  >(action, emptyProductFormState);

  return (
    <form action={formAction}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        {/* Nombre */}
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Nombre del producto
          </label>
          <div className="relative">
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={product?.name}
              placeholder="Salmón premium 500 g"
              required
              minLength={2}
              maxLength={255}
              aria-describedby="name-error"
              className={inputClass}
            />
            <TagIcon className={iconClass} />
          </div>
          <FieldError id="name-error" messages={state.errors?.name} />
        </div>

        {/* SKU */}
        <div className="mb-4">
          <label htmlFor="sku" className="mb-2 block text-sm font-medium">
            SKU
          </label>
          <div className="relative">
            <input
              id="sku"
              name="sku"
              type="text"
              defaultValue={product?.sku}
              placeholder="SAL-500"
              required
              maxLength={64}
              aria-describedby="sku-error sku-help"
              className={`${inputClass} font-mono uppercase`}
            />
            <HashtagIcon className={iconClass} />
          </div>
          <p id="sku-help" className="mt-1 text-xs text-gray-500">
            Identificador único de esta presentación. Mayúsculas, números y
            guiones.
          </p>
          <FieldError id="sku-error" messages={state.errors?.sku} />
        </div>

        {/* URL */}
        <div className="mb-4">
          <label htmlFor="slug" className="mb-2 block text-sm font-medium">
            URL {!isEdit && <span className="text-gray-500">(opcional)</span>}
          </label>
          <div className="relative">
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={product?.slug}
              placeholder="salmon-premium-500-g"
              maxLength={255}
              required={isEdit}
              aria-describedby="slug-error slug-help"
              className={inputClass}
            />
            <LinkIcon className={iconClass} />
          </div>
          <p id="slug-help" className="mt-1 text-xs text-gray-500">
            {isEdit
              ? 'Cambiarla rompe los enlaces que ya apunten a este producto.'
              : 'Si la dejas vacía se genera a partir del nombre.'}
          </p>
          <FieldError id="slug-error" messages={state.errors?.slug} />
        </div>

        {/* Categoría */}
        <div className="mb-4">
          <label
            htmlFor="categoryId"
            className="mb-2 block text-sm font-medium"
          >
            Categoría <span className="text-gray-500">(opcional)</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ''}
            aria-describedby="categoryId-error"
            className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2"
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categories.length === 0 ? (
            <p className="mt-1 text-xs text-gray-500">
              No hay categorías activas.{' '}
              <Link
                href="/dashboard/categories/create"
                className="text-blue-600 underline"
              >
                Crea una
              </Link>{' '}
              si quieres clasificar este producto.
            </p>
          ) : null}
          <FieldError
            id="categoryId-error"
            messages={state.errors?.categoryId}
          />
        </div>

        {/* Precio y costo */}
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="priceCents"
              className="mb-2 block text-sm font-medium"
            >
              Precio de venta (MXN)
            </label>
            <div className="relative">
              <input
                id="priceCents"
                name="priceCents"
                type="text"
                inputMode="decimal"
                defaultValue={
                  product ? centavosToPesosInput(product.priceCents) : ''
                }
                placeholder="349.00"
                required
                aria-describedby="priceCents-error"
                className={inputClass}
              />
              <CurrencyDollarIcon className={iconClass} />
            </div>
            <FieldError
              id="priceCents-error"
              messages={state.errors?.priceCents}
            />
          </div>

          <div>
            <label
              htmlFor="costCents"
              className="mb-2 block text-sm font-medium"
            >
              Costo <span className="text-gray-500">(opcional)</span>
            </label>
            <div className="relative">
              <input
                id="costCents"
                name="costCents"
                type="text"
                inputMode="decimal"
                defaultValue={
                  product?.costCents !== null && product?.costCents !== undefined
                    ? centavosToPesosInput(product.costCents)
                    : ''
                }
                placeholder="210.00"
                aria-describedby="costCents-error costCents-help"
                className={inputClass}
              />
              <CurrencyDollarIcon className={iconClass} />
            </div>
            <p id="costCents-help" className="mt-1 text-xs text-gray-500">
              No se muestra en la tienda.
            </p>
            <FieldError
              id="costCents-error"
              messages={state.errors?.costCents}
            />
          </div>
        </div>

        {/* Unidad de venta y peso */}
        <fieldset className="mb-4">
          <legend className="mb-2 block text-sm font-medium">
            Cómo se vende
          </legend>
          <div className="rounded-md border border-gray-200 bg-white px-[14px] py-3">
            <div className="flex gap-6">
              <div className="flex items-center">
                <input
                  id="unit-pack"
                  name="unitType"
                  type="radio"
                  value="pack"
                  defaultChecked={(product?.unitType ?? 'pack') === 'pack'}
                  required
                  aria-describedby="unitType-error"
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="unit-pack"
                  className="ml-2 cursor-pointer text-sm text-gray-600"
                >
                  Paquete de peso cerrado
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="unit-piece"
                  name="unitType"
                  type="radio"
                  value="piece"
                  defaultChecked={product?.unitType === 'piece'}
                  className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                />
                <label
                  htmlFor="unit-piece"
                  className="ml-2 cursor-pointer text-sm text-gray-600"
                >
                  Por pieza
                </label>
              </div>
            </div>
          </div>
          <FieldError id="unitType-error" messages={state.errors?.unitType} />
        </fieldset>

        <div className="mb-4">
          <label
            htmlFor="netWeightGrams"
            className="mb-2 block text-sm font-medium"
          >
            Peso neto en gramos
          </label>
          <div className="relative">
            <input
              id="netWeightGrams"
              name="netWeightGrams"
              type="number"
              min="1"
              step="1"
              defaultValue={product?.netWeightGrams ?? ''}
              placeholder="500"
              aria-describedby="netWeightGrams-error netWeightGrams-help"
              className={inputClass}
            />
            <ScaleIcon className={iconClass} />
          </div>
          <p id="netWeightGrams-help" className="mt-1 text-xs text-gray-500">
            Obligatorio para paquetes: es lo que el cliente está comprando.
          </p>
          <FieldError
            id="netWeightGrams-error"
            messages={state.errors?.netWeightGrams}
          />
        </div>

        {/* Imagen */}
        <div className="mb-4">
          <label htmlFor="imageUrl" className="mb-2 block text-sm font-medium">
            URL de la imagen <span className="text-gray-500">(opcional)</span>
          </label>
          <div className="relative">
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              defaultValue={product?.imageUrl ?? ''}
              placeholder="https://…"
              aria-describedby="imageUrl-error"
              className={inputClass}
            />
            <PhotoIcon className={iconClass} />
          </div>
          <FieldError id="imageUrl-error" messages={state.errors?.imageUrl} />
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            Descripción <span className="text-gray-500">(opcional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={product?.description ?? ''}
            placeholder="Corte del lomo, sin espinas, empacado al vacío."
            aria-describedby="description-error"
            className="block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 placeholder:text-gray-500"
          />
          <FieldError
            id="description-error"
            messages={state.errors?.description}
          />
        </div>

        {isEdit ? (
          <p className="text-xs text-gray-500">
            El estado del producto no se cambia desde aquí: usa los botones de
            la lista para activarlo o archivarlo.
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            El producto se crea como borrador. Actívalo desde la lista cuando
            esté listo para venderse.
          </p>
        )}

        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p className="mt-4 text-sm text-red-500">{state.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/products"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancelar
        </Link>
        <Button type="submit" aria-disabled={isPending}>
          {isPending
            ? 'Guardando…'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  'peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500';

const iconClass =
  'pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900';

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
