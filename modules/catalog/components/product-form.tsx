'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { centavosToPesosInput } from '@/lib/money';
import type { ProductRow } from '@/db/schema/catalog';
import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import { createProduct, updateProduct } from '../actions';
import { emptyProductFormState, type ProductFormState } from '../form-state';
import type { CategoryOption } from '../queries';
import ImagePicker from './image-picker';

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
 *
 * Eleven fields in one undifferentiated column was the old shape, and it made a
 * long form feel longer than it is. They are three named groups now — what it is,
 * what it costs, how it is sold — which is also the order the operator learns the
 * product in when it arrives at the counter.
 */
export default function ProductForm({ categories, product }: Props) {
  const isEdit = product !== undefined;

  // Offer the active categories, plus the product's current one even if it has
  // since been deactivated: without it the select would fall back to "Sin
  // categoría" and saving would silently unassign the product.
  const selectable = categories.filter(
    (c) => c.active || c.id === product?.categoryId,
  );
  const inactiveCount =
    categories.length - categories.filter((c) => c.active).length;

  const action = isEdit ? updateProduct.bind(null, product.id) : createProduct;

  const [state, formAction, isPending] = useActionState<
    ProductFormState,
    FormData
  >(action, emptyProductFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection title="Identidad">
          <Field name="name" label="Nombre" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={product?.name}
                placeholder="Salmón premium 500 g"
                required
                minLength={2}
                maxLength={255}
              />
            )}
          </Field>

          <Field
            name="sku"
            label="SKU"
            required
            hint="Identificador interno. Debe ser único."
            error={state.errors?.sku}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={product?.sku}
                placeholder="SAL-500"
                required
                maxLength={64}
                className={`${props.className} font-mono`}
              />
            )}
          </Field>

          <Field
            name="slug"
            label={isEdit ? 'URL' : 'URL (opcional)'}
            required={isEdit}
            hint={
              isEdit
                ? 'Cambiarla rompe los enlaces que ya apunten a este producto.'
                : 'Si la dejas vacía se genera a partir del nombre.'
            }
            error={state.errors?.slug}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={product?.slug}
                placeholder="salmon-premium-500-g"
                maxLength={255}
                required={isEdit}
              />
            )}
          </Field>

          <Field
            name="categoryId"
            label="Categoría (opcional)"
            error={state.errors?.categoryId}
            hint={
              categories.length === 0 ? (
                <>
                  Todavía no hay categorías.{' '}
                  <Link
                    href="/dashboard/categories/create"
                    className="text-brand-600 underline"
                  >
                    Crea una
                  </Link>{' '}
                  si quieres clasificar este producto.
                </>
              ) : selectable.length === 0 ? (
                /* Categories exist but none can be offered — say so instead of
                   implying there are none, which invites creating a duplicate. */
                <span className="text-warn">
                  Tienes {inactiveCount}{' '}
                  {inactiveCount === 1
                    ? 'categoría inactiva'
                    : 'categorías inactivas'}{' '}
                  y ninguna activa.{' '}
                  <Link
                    href="/dashboard/categories"
                    className="underline"
                  >
                    Actívala
                  </Link>{' '}
                  para poder asignarla.
                </span>
              ) : undefined
            }
          >
            {(props) => (
              <select
                {...props}
                defaultValue={product?.categoryId ?? ''}
                className={`${props.className} cursor-pointer`}
              >
                <option value="">Sin categoría</option>
                {selectable.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.active ? '' : ' (inactiva)'}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </FormSection>

        <FormSection title="Precio" columns={2}>
          <Field
            name="priceCents"
            label="Precio de venta (MXN)"
            required
            error={state.errors?.priceCents}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                defaultValue={
                  product ? centavosToPesosInput(product.priceCents) : ''
                }
                placeholder="349.00"
                required
                className={`${props.className} tabular-nums`}
              />
            )}
          </Field>

          <Field
            name="costCents"
            label="Costo (opcional)"
            hint="No se muestra en la tienda."
            error={state.errors?.costCents}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                defaultValue={
                  product?.costCents !== null && product?.costCents !== undefined
                    ? centavosToPesosInput(product.costCents)
                    : ''
                }
                placeholder="210.00"
                className={`${props.className} tabular-nums`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Cómo se vende">
          {/*
            A radio group needs its own fieldset and legend — the section's
            legend names the whole group of fields, not this one choice. The
            visible label is `aria-hidden` because the legend already carries it
            for assistive tech, and hearing it twice is worse than not at all.
          */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              Unidad de venta
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  name="unitType"
                  type="radio"
                  value="pack"
                  defaultChecked={(product?.unitType ?? 'pack') === 'pack'}
                  required
                  className="h-4 w-4 cursor-pointer border-line-strong text-brand-600 focus:ring-brand-600"
                />
                Paquete de peso cerrado
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  name="unitType"
                  type="radio"
                  value="piece"
                  defaultChecked={product?.unitType === 'piece'}
                  className="h-4 w-4 cursor-pointer border-line-strong text-brand-600 focus:ring-brand-600"
                />
                Por pieza
              </label>
            </div>
            {state.errors?.unitType ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {state.errors.unitType.join(' ')}
              </p>
            ) : null}
          </fieldset>

          <Field
            name="netWeightGrams"
            label="Peso neto en gramos"
            hint="Obligatorio para paquetes: es lo que el cliente está comprando."
            error={state.errors?.netWeightGrams}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="1"
                step="1"
                defaultValue={product?.netWeightGrams ?? ''}
                placeholder="500"
                className={`${props.className} max-w-40 tabular-nums`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Presentación"
          description={
            isEdit
              ? 'El estado del producto no se cambia desde aquí: usa los botones de la lista para activarlo o archivarlo.'
              : 'El producto se crea como borrador. Actívalo desde la lista cuando esté listo para venderse.'
          }
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">
              Imagen (opcional)
            </span>
            <ImagePicker name="imageUrl" defaultValue={product?.imageUrl} />
            {state.errors?.imageUrl ? (
              <p role="alert" className="text-xs text-danger">
                {state.errors.imageUrl.join(' ')}
              </p>
            ) : null}
          </div>

          <Field
            name="description"
            label="Descripción (opcional)"
            error={state.errors?.description}
          >
            {(props) => (
              <textarea
                {...props}
                rows={3}
                maxLength={2000}
                defaultValue={product?.description ?? ''}
                placeholder="Corte del lomo, sin espinas, empacado al vacío."
              />
            )}
          </Field>
        </FormSection>
      </FormCard>

      <FormActions
        cancelHref="/dashboard/products"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear producto'}
        isPending={isPending}
      />
    </form>
  );
}
