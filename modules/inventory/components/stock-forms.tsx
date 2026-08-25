'use client';

import { useActionState } from 'react';
import {
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import {
  receiveStock,
  adjustStock,
  setLowStockThreshold,
} from '../actions';
import { emptyStockFormState, type StockFormState } from '../form-state';

/**
 * Record a delivery. Always adds, never subtracts (RF-INV-003) — taking stock
 * out is an adjustment, and keeping the two apart is what makes the ledger
 * readable later.
 */
export function ReceiveStockForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState<
    StockFormState,
    FormData
  >(receiveStock.bind(null, productId), emptyStockFormState);

  return (
    <FormShell
      title="Recibir mercancía"
      icon={<ArrowDownTrayIcon className="w-5 text-gray-500" />}
      action={formAction}
      state={state}
    >
      <div className="mb-4">
        <label
          htmlFor="receive-quantity"
          className="mb-2 block text-sm font-medium"
        >
          Cantidad recibida
        </label>
        <input
          id="receive-quantity"
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          placeholder="20"
          aria-describedby="receive-quantity-error"
          className={inputClass}
        />
        <FieldError
          id="receive-quantity-error"
          messages={state.errors?.quantity}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="receive-note" className="mb-2 block text-sm font-medium">
          Nota <span className="text-gray-500">(opcional)</span>
        </label>
        <input
          id="receive-note"
          name="note"
          type="text"
          maxLength={500}
          placeholder="Factura 4471, proveedor Mariscos del Golfo"
          aria-describedby="receive-note-error"
          className={inputClass}
        />
        <FieldError id="receive-note-error" messages={state.errors?.note} />
      </div>

      <Button type="submit" aria-disabled={isPending}>
        {isPending ? 'Registrando…' : 'Registrar entrada'}
      </Button>
    </FormShell>
  );
}

/**
 * Correct the count, up or down, with a mandatory reason (RF-INV-004).
 */
export function AdjustStockForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState<
    StockFormState,
    FormData
  >(adjustStock.bind(null, productId), emptyStockFormState);

  return (
    <FormShell
      title="Ajustar existencias"
      icon={<AdjustmentsHorizontalIcon className="w-5 text-gray-500" />}
      action={formAction}
      state={state}
    >
      <div className="mb-4">
        <label
          htmlFor="adjust-quantity"
          className="mb-2 block text-sm font-medium"
        >
          Ajuste
        </label>
        <input
          id="adjust-quantity"
          name="quantity"
          type="number"
          step="1"
          required
          placeholder="-3"
          aria-describedby="adjust-quantity-error adjust-quantity-help"
          className={inputClass}
        />
        <p id="adjust-quantity-help" className="mt-1 text-xs text-gray-500">
          Negativo para restar, positivo para sumar. No puedes bajar de las
          unidades ya reservadas.
        </p>
        <FieldError
          id="adjust-quantity-error"
          messages={state.errors?.quantity}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="adjust-note" className="mb-2 block text-sm font-medium">
          Motivo
        </label>
        <input
          id="adjust-note"
          name="note"
          type="text"
          required
          minLength={3}
          maxLength={500}
          placeholder="Merma por rotura de cadena de frío"
          aria-describedby="adjust-note-error adjust-note-help"
          className={inputClass}
        />
        <p id="adjust-note-help" className="mt-1 text-xs text-gray-500">
          Obligatorio: un ajuste sin explicación no se puede auditar.
        </p>
        <FieldError id="adjust-note-error" messages={state.errors?.note} />
      </div>

      <Button type="submit" aria-disabled={isPending}>
        {isPending ? 'Registrando…' : 'Registrar ajuste'}
      </Button>
    </FormShell>
  );
}

/** Alert threshold. A policy setting, so it writes no ledger entry. */
export function ThresholdForm({
  productId,
  current,
}: {
  productId: string;
  current: number;
}) {
  const [state, formAction, isPending] = useActionState<
    StockFormState,
    FormData
  >(setLowStockThreshold.bind(null, productId), emptyStockFormState);

  return (
    <FormShell
      title="Umbral de bajo stock"
      icon={<BellAlertIcon className="w-5 text-gray-500" />}
      action={formAction}
      state={state}
    >
      <div className="mb-4">
        <label
          htmlFor="lowStockThreshold"
          className="mb-2 block text-sm font-medium"
        >
          Avisar cuando el disponible sea igual o menor a
        </label>
        <input
          id="lowStockThreshold"
          name="lowStockThreshold"
          type="number"
          min="0"
          step="1"
          defaultValue={current}
          aria-describedby="threshold-error"
          className={inputClass}
        />
        <FieldError
          id="threshold-error"
          messages={state.errors?.lowStockThreshold}
        />
      </div>

      <Button type="submit" aria-disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar umbral'}
      </Button>
    </FormShell>
  );
}

function FormShell({
  title,
  icon,
  action,
  state,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action: (formData: FormData) => void;
  state: StockFormState;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className="rounded-md bg-gray-50 p-4 md:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </h3>
      {children}
      <div aria-live="polite" aria-atomic="true">
        {state.message ? (
          <p className="mt-3 text-sm text-red-500">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}

const inputClass =
  'block w-full rounded-md border border-gray-200 py-2 px-3 text-sm outline-2 placeholder:text-gray-500';

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
