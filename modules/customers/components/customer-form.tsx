'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  UserCircleIcon,
  PhoneIcon,
  AtSymbolIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import type { CustomerRow } from '@/db/schema/customers';
import { createCustomer, updateCustomer } from '../actions';
import {
  emptyCustomerFormState,
  type CustomerFormState,
} from '../form-state';

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
    <form action={formAction}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6">
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <div className="relative">
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={customer?.name}
              placeholder="Ana Ruiz"
              required
              minLength={2}
              maxLength={255}
              aria-describedby="name-error"
              className={inputClass}
            />
            <UserCircleIcon className={iconClass} />
          </div>
          <FieldError id="name-error" messages={state.errors?.name} />
        </div>

        <div className="mb-4">
          <label htmlFor="phone" className="mb-2 block text-sm font-medium">
            Teléfono
          </label>
          <div className="relative">
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={phoneValue}
              placeholder="55 1234 5678"
              required
              maxLength={32}
              aria-describedby="phone-error phone-help"
              className={inputClass}
            />
            <PhoneIcon className={iconClass} />
          </div>
          <p id="phone-help" className="mt-1 text-xs text-gray-500">
            Obligatorio: es cómo se contacta al cliente para la entrega.
          </p>
          <FieldError id="phone-error" messages={state.errors?.phone} />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Correo <span className="text-gray-500">(opcional)</span>
          </label>
          <div className="relative">
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={customer?.email ?? ''}
              placeholder="ana@ejemplo.mx"
              maxLength={255}
              aria-describedby="email-error"
              className={inputClass}
            />
            <AtSymbolIcon className={iconClass} />
          </div>
          <FieldError id="email-error" messages={state.errors?.email} />
        </div>

        {isEdit ? (
          <p className="text-xs text-gray-500">
            Cambiar estos datos no altera los pedidos ya registrados: cada
            pedido guarda su propia copia del contacto.
          </p>
        ) : null}

        <div aria-live="polite" aria-atomic="true">
          {state.message ? (
            <p className="mt-4 text-sm text-red-500">{state.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Link
          href="/dashboard/customers"
          className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          Cancelar
        </Link>
        <Button type="submit" aria-disabled={isPending}>
          {isPending
            ? 'Guardando…'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear cliente'}
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
