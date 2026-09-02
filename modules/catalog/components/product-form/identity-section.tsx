'use client';

import Link from 'next/link';

import Field from '@/app/ui/kit/field';
import { FormSection } from '@/app/ui/kit/form';
import type { CategoryOption } from '../../queries';
import type { SectionProps } from './section';

/**
 * Quién es este producto.
 *
 * Nombre, SKU, URL y a qué categorías pertenece. Es la primera sección porque
 * es la única cuyos datos no se pueden deducir de nada más.
 */
export default function IdentitySection({
  product,
  errors,
  categories,
  selectedCategoryIds,
}: SectionProps & {
  /** Las categorías que se pueden marcar, con su estado activo. */
  categories: CategoryOption[];
  /** Las que ya tiene marcadas. Vacío al crear. */
  selectedCategoryIds: string[];
}) {
  const isEdit = Boolean(product);
  const selected = new Set(selectedCategoryIds);

  /*
   * Se ofrecen las activas más las que el producto ya tiene, aunque estén
   * desactivadas. Sin esa segunda mitad el grupo se dibujaba sin marcar y
   * guardar sacaba el producto de una estantería sin decírselo a nadie.
   */
  const selectable = categories.filter((c) => c.active || selected.has(c.id));
  const inactiveCount = categories.filter((c) => !c.active).length;

  return (
    <FormSection title="Identidad">
      <Field name="name" label="Nombre" required error={errors?.name}>
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
        error={errors?.sku}
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
        error={errors?.slug}
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

      {/*
        Casillas y no un `select`: un producto pertenece a varias
        categorías —«Filete de Salmón» es Filetes y es Fresco— y un
        desplegable múltiple esconde lo que hay marcado detrás de un
        scroll de tres líneas. Aquí el estado del producto se lee entero
        sin abrir nada.

        `fieldset`/`legend` en vez del componente `Field`: éste monta un
        `<label for>`, que apunta a un control concreto. Un grupo de
        casillas no es un control, y etiquetarlo así hace que el lector de
        pantalla anuncie el grupo como si fuera la primera casilla.
      */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ink">
          Categorías (opcional)
        </legend>

        {categories.length === 0 ? (
          <p className="text-xs text-ink-muted">
            Todavía no hay categorías.{' '}
            <Link
              href="/dashboard/categories/create"
              className="text-brand-600 underline"
            >
              Crea una
            </Link>{' '}
            si quieres clasificar este producto.
          </p>
        ) : selectable.length === 0 ? (
          /* Categories exist but none can be offered — say so instead of
             implying there are none, which invites creating a duplicate. */
          <p className="text-xs text-warn">
            Tienes {inactiveCount}{' '}
            {inactiveCount === 1
              ? 'categoría inactiva'
              : 'categorías inactivas'}{' '}
            y ninguna activa.{' '}
            <Link href="/dashboard/categories" className="underline">
              Actívala
            </Link>{' '}
            para poder asignarla.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {selectable.map((category) => (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={category.id}
                  defaultChecked={selected.has(category.id)}
                  className="size-4 cursor-pointer accent-brand-600"
                />
                {category.name}
                {category.active ? '' : ' (inactiva)'}
              </label>
            ))}
          </div>
        )}

        {errors?.categoryIds ? (
          <div role="alert" className="flex flex-col gap-0.5">
            {errors.categoryIds.map((m) => (
              <p key={m} className="text-xs text-danger">
                {m}
              </p>
            ))}
          </div>
        ) : null}
      </fieldset>
    </FormSection>
  );
}
