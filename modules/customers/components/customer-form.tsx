'use client';

import { useActionState } from 'react';

import type { CustomerRow } from '@/db/schema/customers';
import Field from '@/app/ui/kit/field';
import {
  FormCard,
  FormSection,
  FormError,
  FormActions,
} from '@/app/ui/kit/form';
import { createCustomer, updateCustomer } from '../actions';
import { emptyCustomerFormState, type CustomerFormState } from '../form-state';

export default function CustomerForm({
  customer,
}: {
  customer?: CustomerRow;
}) {
  const isEdit = customer !== undefined;

  const action = isEdit
    ? updateCustomer.bind(null, customer.id)
    : createCustomer;

  const [state, formAction, isPending] = useActionState<
    CustomerFormState,
    FormData
  >(action, emptyCustomerFormState);

  // The tutorial rows carry this placeholder instead of a real number; showing
  // it in the field would invite someone to "fix" it into a fake phone.
  const phoneValue =
    customer?.phone === 'SIN TELEFONO' ? '' : (customer?.phone ?? '');

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <FormSection
          title="Contacto"
          description={
            isEdit
              ? 'Cambiar estos datos no altera los pedidos ya registrados: cada pedido guarda su propia copia del contacto.'
              : undefined
          }
        >
          <Field name="name" label="Nombre" required error={state.errors?.name}>
            {(props) => (
              <input
                {...props}
                type="text"
                defaultValue={customer?.name}
                placeholder="Ana Ruiz"
                autoComplete="name"
                required
                minLength={2}
                maxLength={255}
              />
            )}
          </Field>

          <Field
            name="phone"
            label="Teléfono"
            required
            hint="Es cómo se contacta al cliente para confirmar la entrega."
            error={state.errors?.phone}
          >
            {(props) => (
              <input
                {...props}
                type="tel"
                inputMode="tel"
                defaultValue={phoneValue}
                placeholder="55 1234 5678"
                autoComplete="tel"
                required
                maxLength={32}
              />
            )}
          </Field>

          <Field
            name="email"
            label="Correo (opcional)"
            error={state.errors?.email}
          >
            {(props) => (
              <input
                {...props}
                type="email"
                defaultValue={customer?.email ?? ''}
                placeholder="ana@ejemplo.mx"
                autoComplete="email"
                maxLength={255}
              />
            )}
          </Field>
        </FormSection>
      </FormCard>

      <FormActions
        cancelHref="/dashboard/customers"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear cliente'}
        isPending={isPending}
      />
    </form>
  );
}
