'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

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
import { WEEKDAYS } from '../preorder';
import type { SupplyType } from '@/db/schema/catalog';

/**
 * Las unidades de venta, con una línea que dice cuándo se usa cada una.
 *
 * El orden no es el del enum sino el de frecuencia en el mostrador: casi todo
 * se vende por kilo, y la opción más usada debe ser la primera que se lee.
 * `kg` es también el valor por defecto al crear, por el mismo motivo.
 */
const UNIT_CHOICES = [
  { value: 'kg', label: 'Por kilo', hint: 'El precio es por kilogramo.' },
  {
    value: 'pack',
    label: 'Paquete de peso cerrado',
    hint: 'Pide peso neto: es lo que distingue uno de 500 g de uno de 2 kg.',
  },
  { value: 'dozen', label: 'Por docena', hint: 'Ostión, almeja chocolata.' },
  { value: 'piece', label: 'Por pieza', hint: 'Se cobra la pieza, pese lo que pese.' },
] as const;

/** Una casilla con su etiqueta y la línea que dice qué hace. */
function Flag({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600"
      />
      <span>
        {label}
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}

type Props = {
  categories: CategoryOption[];
  /** Present when editing; absent when creating. */
  product?: ProductRow;
  /** Las categorías que el producto ya tiene marcadas. Vacío al crear. */
  selectedCategoryIds?: string[];
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
export default function ProductForm({
  categories,
  product,
  selectedCategoryIds = [],
}: Props) {
  const isEdit = product !== undefined;
  const selected = new Set(selectedCategoryIds);

  // El ciclo de encargo sólo se pide cuando aplica: pedirlo siempre llenaría el
  // formulario de campos que nadie va a usar en el 90 % de los productos.
  const [supply, setSupply] = useState<SupplyType>(
    product?.supplyType ?? 'fresh',
  );

  // Offer the active categories, plus any the product already has even if they
  // have since been deactivated: without them the group would render unchecked
  // and saving would silently unfile the product.
  const selectable = categories.filter((c) => c.active || selected.has(c.id));
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

            {state.errors?.categoryIds ? (
              <div role="alert" className="flex flex-col gap-0.5">
                {state.errors.categoryIds.map((m) => (
                  <p key={m} className="text-xs text-danger">
                    {m}
                  </p>
                ))}
              </div>
            ) : null}
          </fieldset>
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

        {/*
          Las tres banderas de escaparate, juntas y con su efecto explicado.

          Vivían sólo en la base: se podían escribir por SQL y por nada más, así
          que las dos bandas de la portada que dependen de ellas llevaban vacías
          desde que se cargó el catálogo real. Un campo que la interfaz no
          ofrece es un campo que en la práctica no existe.

          El texto de cada casilla dice **dónde** sale el producto, no cómo se
          llama la columna: quien marca esto está decidiendo el aspecto de la
          portada, no rellenando un formulario.
        */}
        <FormSection
          title="En la portada"
          description="Dónde aparece este producto en la página principal de la tienda. No cambia precio, existencia ni entrega."
        >
          <div className="flex flex-col gap-3">
            <Flag
              name="isFeaturedItem"
              label="La pesca de la semana"
              hint="Encabeza la portada con foto grande, ficha y precio. Sólo puede haber uno: al marcar éste se desmarca el anterior."
              defaultChecked={product?.isFeaturedItem ?? false}
            />
            <Flag
              name="isFeatured"
              label="Destacado"
              hint="Entra en la banda «Más vendidos». Pueden ser varios."
              defaultChecked={product?.isFeatured ?? false}
            />
            <Flag
              name="isSeasonal"
              label="De temporada"
              hint="Añade la etiqueta amarilla «De temporada» en la tarjeta: no siempre lo vamos a tener."
              defaultChecked={product?.isSeasonal ?? false}
            />
          </div>
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
            {/*
              Las cuatro del enum, no dos.

              Sólo había «paquete» y «pieza». Con `kg` y `docena` en la base
              —el catálogo real se cotiza así— un producto por kilo abría el
              formulario sin ninguna opción marcada y no se podía guardar: el
              validador pedía una unidad que la interfaz no ofrecía. Era un
              producto que la tienda vendía y el admin no podía editar.
            */}
            <div className="grid gap-2 sm:grid-cols-2">
              {UNIT_CHOICES.map(({ value, label, hint }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 text-sm text-ink"
                >
                  <input
                    name="unitType"
                    type="radio"
                    value={value}
                    defaultChecked={(product?.unitType ?? 'kg') === value}
                    required
                    className="mt-0.5 h-4 w-4 cursor-pointer border-line-strong text-brand-600 focus:ring-brand-600"
                  />
                  <span>
                    {label}
                    <span className="block text-xs text-ink-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {state.errors?.unitType ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {state.errors.unitType.join(' ')}
              </p>
            ) : null}
          </fieldset>

          {/*
            De dónde sale el producto.
            
            Es la decisión que más cambia lo que pasa después: un fresco y un
            congelado descuentan existencia, y uno por encargo no tiene ninguna
            que descontar. Va antes del peso porque condiciona el resto del
            formulario.
          */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              Abastecimiento
            </legend>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    value: 'fresh',
                    label: 'Fresco del día',
                    detail:
                      'La captura. Se agota y sale del catálogo hasta que vuelva a entrar.',
                  },
                  {
                    value: 'stocked',
                    label: 'Siempre disponible',
                    detail:
                      'Congelado o despensa. Descuenta existencia igual, pero no depende de lo que llegue hoy.',
                  },
                  {
                    value: 'preorder',
                    label: 'Por encargo',
                    detail:
                      'No lo tienes. El cliente lo pide, tú lo compras y llega en la fecha del ciclo. No reserva inventario.',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line px-3 py-2.5 text-sm text-ink has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
                >
                  <input
                    name="supplyType"
                    type="radio"
                    value={option.value}
                    defaultChecked={
                      (product?.supplyType ?? 'fresh') === option.value
                    }
                    onChange={() => setSupply(option.value)}
                    className="mt-0.5 h-4 w-4 cursor-pointer border-line-strong text-brand-600 focus:ring-brand-600"
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {state.errors?.supplyType ? (
              <p role="alert" className="mt-1.5 text-xs text-danger">
                {state.errors.supplyType.join(' ')}
              </p>
            ) : null}
          </fieldset>

          {supply === 'preorder' ? (
            <div className="flex flex-col gap-4 rounded-md border border-line bg-subtle/50 px-3.5 py-3.5">
              <p className="text-xs text-ink-muted">
                El ciclo se repite cada semana. «Pide antes del martes a las 6,
                llega el viernes»: la tienda calcula las fechas concretas para
                cada cliente según cuándo mire.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  name="preorderCutoffWeekday"
                  label="Corte"
                  required
                  error={state.errors?.preorderCutoffWeekday}
                >
                  {(props) => (
                    <select
                      {...props}
                      defaultValue={product?.preorderCutoffWeekday ?? 2}
                      required
                    >
                      {WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  name="preorderCutoffHour"
                  label="Hora"
                  hint="24 h"
                  required
                  error={state.errors?.preorderCutoffHour}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      min="0"
                      max="23"
                      step="1"
                      defaultValue={product?.preorderCutoffHour ?? 18}
                      required
                    />
                  )}
                </Field>

                <Field
                  name="preorderArrivalWeekday"
                  label="Llega el"
                  required
                  error={state.errors?.preorderArrivalWeekday}
                >
                  {(props) => (
                    <select
                      {...props}
                      defaultValue={product?.preorderArrivalWeekday ?? 5}
                      required
                    >
                      {WEEKDAYS.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              <Field
                name="preorderNote"
                label="Nota para el cliente (opcional)"
                hint="Se muestra después de la fecha, no en su lugar."
                error={state.errors?.preorderNote}
              >
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    maxLength={280}
                    defaultValue={product?.preorderNote ?? ''}
                    placeholder="Llega directo del muelle."
                  />
                )}
              </Field>
            </div>
          ) : null}

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
