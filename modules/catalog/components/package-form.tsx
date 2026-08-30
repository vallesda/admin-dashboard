'use client';

import { useActionState } from 'react';

import type { PackageRow } from '@/db/schema/catalog';
import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import ImagePicker from './image-picker';
import { createPackage, updatePackage } from '../actions';
import { emptyPackageFormState, type PackageFormState } from '../form-state';

/**
 * Create/edit form for a package.
 *
 * One component for both modes, like the category and product forms: identical
 * fields kept in two files is how the invoice pair drifted apart.
 *
 * The lines are edited separately, on the edit screen. A create form that also
 * managed line items would need the package to exist before it could attach
 * anything to it — so creating one lands on its own editor, where the pieces go
 * in.
 */
export default function PackageForm({ pkg }: { pkg?: PackageRow }) {
  const isEdit = pkg !== undefined;

  const action = isEdit ? updatePackage.bind(null, pkg.id) : createPackage;

  const [state, formAction, isPending] = useActionState<
    PackageFormState,
    FormData
  >(action, emptyPackageFormState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection title="Identidad">
          <Field name="name" label="Nombre del paquete" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={pkg?.name}
                placeholder="Ceviche para cuatro"
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
                ? 'Cambiarla rompe los enlaces que ya apunten a este paquete.'
                : 'Si la dejas vacía se genera a partir del nombre.'
            }
            error={state.errors?.slug}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={pkg?.slug}
                placeholder="ceviche-para-cuatro"
                maxLength={140}
                required={isEdit}
              />
            )}
          </Field>

          <Field
            name="tagline"
            label="Frase corta (opcional)"
            hint="Se muestra bajo el nombre en la portada de la tienda."
            error={state.errors?.tagline}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={pkg?.tagline ?? ''}
                placeholder="Pescado firme y marisco fresco"
                maxLength={160}
              />
            )}
          </Field>

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
                defaultValue={pkg?.description ?? ''}
                placeholder="Todo lo que necesitas para un ceviche que rinde cuatro porciones."
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Presentación" columns={2}>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-ink">
              Imagen (opcional)
            </span>
            <ImagePicker name="imageUrl" defaultValue={pkg?.imageUrl ?? null} />
            {state.errors?.imageUrl ? (
              <p role="alert" className="text-xs text-danger">
                {state.errors.imageUrl.join(' ')}
              </p>
            ) : null}
          </div>

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
                defaultValue={pkg?.sortOrder ?? 0}
                className={`${props.className} max-w-32 tabular-nums`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Visibilidad"
          description="Un paquete publicado aparece en la portada y en el catálogo — pero solo si tiene al menos un producto activo."
        >
          <div className="flex items-start gap-2.5">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={pkg?.active ?? true}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600"
            />
            <label htmlFor="active" className="cursor-pointer text-sm text-ink">
              Publicar en la tienda
            </label>
          </div>
        </FormSection>
      </FormCard>

      <FormActions
        cancelHref="/dashboard/packages"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear paquete'}
        isPending={isPending}
      />
    </form>
  );
}
