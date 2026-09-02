'use client';

import Field from '@/app/ui/kit/field';
import { FormSection } from '@/app/ui/kit/form';
import type { SupplyType } from '@/db/schema/catalog';
import { WEEKDAYS } from '../../preorder';
import type { SectionProps } from './section';

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

/**
 * Cómo se vende: unidad, procedencia, ciclo de encargo y peso neto.
 *
 * La sección más larga del formulario, y la única con partes que aparecen y
 * desaparecen: elegir «por encargo» destapa el ciclo semanal —corte, hora y día
 * de llegada— y elegir «paquete» hace obligatorio el peso neto. Por eso es la
 * única que necesita estado, y por eso el estado vive arriba, en el formulario,
 * y baja como props: así el resto de secciones no tiene que saber que existe.
 */
export default function SellingSection({
  product,
  errors,
  supply,
  onSupplyChange,
}: SectionProps & {
  /** De dónde sale el producto. Decide si se muestra el ciclo de encargo. */
  supply: SupplyType;
  onSupplyChange: (next: SupplyType) => void;
}) {

  return (
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
        {errors?.unitType ? (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {errors.unitType.join(' ')}
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
                /*
                 * Controlado por `supply`, no por `product`.
                 *
                 * Antes la marca salía de `product?.supplyType` mientras el
                 * ciclo de encargo se mostraba según `supply`: dos fuentes para
                 * el mismo hecho. Arrancan iguales, así que no se notaba, pero
                 * nada lo garantizaba — y la primera prueba que las separó
                 * dibujó un formulario que mostraba el ciclo con «Fresco»
                 * marcado. Una sola fuente lo vuelve imposible.
                 */
                checked={supply === option.value}
                onChange={() => onSupplyChange(option.value)}
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
        {errors?.supplyType ? (
          <p role="alert" className="mt-1.5 text-xs text-danger">
            {errors.supplyType.join(' ')}
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
              error={errors?.preorderCutoffWeekday}
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
              error={errors?.preorderCutoffHour}
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
              error={errors?.preorderArrivalWeekday}
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
            error={errors?.preorderNote}
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
        error={errors?.netWeightGrams}
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
  );
}
