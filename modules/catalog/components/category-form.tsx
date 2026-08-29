'use client';

import { useActionState } from 'react';

import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import { createCategory, updateCategory } from '../actions';
import { emptyCategoryFormState, type CategoryFormState } from '../form-state';
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
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection title="Identidad">
          <Field name="name" label="Nombre de la categoría" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={category?.name}
                placeholder="Pescado fresco"
                required
                minLength={2}
                maxLength={120}
              />
            )}
          </Field>

          <Field
            name="slug"
            label={isEdit ? 'URL' : 'URL (opcional)'}
            required={isEdit}
            hint={
              isEdit
                ? 'Cambiarla rompe los enlaces que ya apunten a esta categoría.'
                : 'Si la dejas vacía se genera a partir del nombre.'
            }
            error={state.errors?.slug}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={category?.slug}
                placeholder="pescado-fresco"
                maxLength={140}
                required={isEdit}
              />
            )}
          </Field>

          <Field
            name="sortOrder"
            label="Orden"
            hint="Menor número aparece primero."
            error={state.errors?.sortOrder}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="1"
                min="0"
                max="9999"
                defaultValue={category?.sortOrder ?? 0}
                className={`${props.className} max-w-32`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Visibilidad"
          description="Una categoría inactiva no se puede asignar a productos nuevos ni aparece en la tienda."
        >
          <div className="flex items-start gap-2.5">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={category?.active ?? true}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600"
            />
            <label
              htmlFor="active"
              className="cursor-pointer text-sm text-ink"
            >
              Categoría activa
            </label>
          </div>
        </FormSection>
      </FormCard>

      <FormActions
        cancelHref="/dashboard/categories"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear categoría'}
        isPending={isPending}
      />
    </form>
  );
}
