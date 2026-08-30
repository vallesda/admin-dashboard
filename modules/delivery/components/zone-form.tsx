'use client';

import { useActionState } from 'react';

import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import { centavosToPesosInput } from '@/lib/money';
import { createZone, updateZone } from '../actions';
import { emptyZoneFormState, type ZoneFormState } from '../form-state';
import type { DeliveryZoneRow } from '@/db/schema/delivery';

type Props = {
  zone?: DeliveryZoneRow & { postalCodes: string[] };
};

/**
 * Crear/editar una zona de reparto.
 *
 * Un formulario para los dos modos: los campos son idénticos y tenerlos en dos
 * archivos garantiza que se separen.
 */
export default function ZoneForm({ zone }: Props) {
  const isEdit = zone !== undefined;
  const action = isEdit ? updateZone.bind(null, zone.id) : createZone;

  const [state, formAction, isPending] = useActionState<ZoneFormState, FormData>(
    action,
    emptyZoneFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection title="Identidad">
          <Field name="name" label="Nombre de la zona" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={zone?.name}
                placeholder="Centro y Roma"
                required
                minLength={2}
                maxLength={120}
              />
            )}
          </Field>

          <Field
            name="sortOrder"
            label="Orden"
            hint="Menor número aparece primero en la lista."
            error={state.errors?.sortOrder}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="1"
                min="0"
                max="9999"
                defaultValue={zone?.sortOrder ?? 0}
                className={`${props.className} max-w-32`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Tarifa"
          description="Lo que se cobra por llevar un pedido a cualquier código postal de esta zona."
          columns={2}
        >
          <Field
            name="feeCents"
            label="Costo de envío"
            hint="En pesos. Cero es válido: una zona de reparto gratuito."
            required
            error={state.errors?.feeCents}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                defaultValue={centavosToPesosInput(zone?.feeCents ?? 0)}
                required
              />
            )}
          </Field>

          <Field
            name="freeOverCents"
            label="Gratis a partir de (opcional)"
            hint="Se compara contra la mercancía, sin contar el envío."
            error={state.errors?.freeOverCents}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                defaultValue={
                  zone?.freeOverCents != null
                    ? centavosToPesosInput(zone.freeOverCents)
                    : ''
                }
                placeholder="800.00"
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Cobertura"
          description="Un código postal pertenece a una sola zona. Si ya está en otra, el guardado te dirá cuál."
        >
          <Field
            name="postalCodes"
            label="Códigos postales"
            hint="Pega una lista: separados por comas, espacios o saltos de línea."
            error={state.errors?.postalCodes}
          >
            {(props) => (
              <textarea
                {...props}
                rows={6}
                defaultValue={zone?.postalCodes.join('\n') ?? ''}
                placeholder={'06000\n06500\n06700'}
                className={`${props.className} font-mono text-xs`}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Visibilidad"
          description="Una zona inactiva deja de cotizar: la tienda dirá que no hay entregas en esos códigos postales. Los pedidos que ya se cobraron con ella conservan su historia."
        >
          <div className="flex items-start gap-2.5">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={zone?.active ?? true}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-line-strong text-brand-600 focus:ring-brand-600"
            />
            <label htmlFor="active" className="cursor-pointer text-sm text-ink">
              Zona activa
            </label>
          </div>
        </FormSection>
      </FormCard>

      <FormActions
        cancelHref="/dashboard/delivery"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear zona'}
        isPending={isPending}
      />
    </form>
  );
}
