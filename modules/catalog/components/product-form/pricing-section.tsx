'use client';

import Field from '@/app/ui/kit/field';
import { FormSection } from '@/app/ui/kit/form';
import { centavosToPesosInput } from '@/lib/money';
import type { SectionProps } from './section';

/**
 * Cuánto cuesta y cuánto costó.
 *
 * El margen no se guarda: sale de la resta, y guardarlo sería un tercer número
 * que puede contradecir a los otros dos.
 */
export default function PricingSection({ product, errors }: SectionProps) {

  return (
    <FormSection title="Precio" columns={2}>
      <Field
        name="priceCents"
        label="Precio de venta (MXN)"
        required
        error={errors?.priceCents}
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
        error={errors?.costCents}
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
  );
}
