'use client';

import { useActionState } from 'react';
import {
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

import { Button } from '@/app/ui/button';
import Panel from '@/app/ui/kit/panel';
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
      icon={<ArrowDownTrayIcon className="h-4 w-4 text-ink-subtle" />}
      action={formAction}
      state={state}
    >
      <div className="">
        <label
          htmlFor="receive-quantity"
          className="mb-1.5 block text-sm font-medium text-ink"
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

      <div className="">
        <label htmlFor="receive-note" className="mb-1.5 block text-sm font-medium text-ink">
          Nota <span className="text-ink-muted">(opcional)</span>
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
      icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-ink-subtle" />}
      action={formAction}
      state={state}
    >
      <div className="">
        <label
          htmlFor="adjust-quantity"
          className="mb-1.5 block text-sm font-medium text-ink"
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
        <p id="adjust-quantity-help" className="mt-1.5 text-xs text-ink-muted">
          Negativo para restar, positivo para sumar. No puedes bajar de las
          unidades ya reservadas.
        </p>
        <FieldError
          id="adjust-quantity-error"
          messages={state.errors?.quantity}
        />
      </div>

      <div className="">
        <label htmlFor="adjust-note" className="mb-1.5 block text-sm font-medium text-ink">
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
        <p id="adjust-note-help" className="mt-1.5 text-xs text-ink-muted">
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
      icon={<BellAlertIcon className="h-4 w-4 text-ink-subtle" />}
      action={formAction}
      state={state}
    >
      <div className="">
        <label
          htmlFor="lowStockThreshold"
          className="mb-1.5 block text-sm font-medium text-ink"
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

/**
 * The shell the three stock forms share.
 *
 * Each is a `Panel` with its own submit, because they are three independent
 * writes to the ledger — receiving stock, correcting a count and changing the
 * alert threshold are not steps of one operation and must not share a save
 * button.
 */
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
    <form action={action}>
      <Panel
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        }
        className="h-full"
      >
        <div className="flex flex-col gap-4">
          {children}
          {state.message ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      </Panel>
    </form>
  );
}

const inputClass = 'field';

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;

  return (
    <div id={id} role="alert">
      {messages.map((message) => (
        <p className="mt-1.5 text-xs text-danger" key={message}>
          {message}
        </p>
      ))}
    </div>
  );
}
