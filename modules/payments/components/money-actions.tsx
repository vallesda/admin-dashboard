'use client';

/*
 * Client Component: these are dialogs with local open/closed state and forms
 * driven by `useActionState`.
 */

import { useActionState, useEffect, useState } from 'react';

import Dialog from '@/app/ui/kit/dialog';
import Field from '@/app/ui/kit/field';
import { Button } from '@/app/ui/button';
import { Can } from '@/app/ui/kit/role';
import { useToast } from '@/app/ui/kit/toast';
import { IDLE_RESULT, type ActionResult } from '@/lib/action-result';
import { centavosToPesosInput, formatCentavos } from '@/lib/money';
import ActionRunner from '@/app/ui/kit/action-runner';
import {
  cancelOrder,
  cancelOrderWithMoney,
  recordPayment,
  refundOrder,
  sendPaymentLink,
  settleAndComplete,
} from '../actions';

/**
 * Announces an action's outcome and closes the dialog when it worked.
 *
 * The dialog must not close on failure: the operator's typed amount is still in
 * the form and losing it to a rejected submit is how a person ends up entering
 * the same refund twice.
 */
function useOutcome(state: ActionResult, onSuccess: () => void) {
  const { notify } = useToast();

  useEffect(() => {
    if (state.status === 'idle') return;

    notify({
      tone: state.status === 'ok' ? 'ok' : 'error',
      message: state.message,
    });

    if (state.status === 'ok') onSuccess();
    // `notify` and `onSuccess` are stable for this component's lifetime; adding
    // them re-fires the toast on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

const PROVIDERS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'transfer', label: 'Transferencia' },
] as const;

function ProviderField() {
  return (
    <Field name="provider" label="¿Cómo se recibió?" required>
      {(props) => (
        <select {...props} defaultValue="cash" required>
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function AmountField({
  label,
  defaultValue,
  hint,
}: {
  label: string;
  defaultValue: number;
  hint?: string;
}) {
  return (
    <Field name="amount" label={label} hint={hint} required>
      {(props) => (
        <input
          {...props}
          type="text"
          inputMode="decimal"
          defaultValue={centavosToPesosInput(defaultValue)}
          required
        />
      )}
    </Field>
  );
}

/**
 * Records money taken by a person.
 *
 * Stripe is not an option in the method list, and that is deliberate: an online
 * charge is written by the webhook from what Stripe reports. Typing one in by
 * hand would put a claim in the ledger that no reconciliation could ever settle.
 */
export function RecordPayment({
  orderId,
  outstandingCents,
}: {
  orderId: string;
  outstandingCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    recordPayment.bind(null, orderId),
    IDLE_RESULT,
  );

  useOutcome(state, () => setOpen(false));

  return (
    <Can
      role="admin"
      fallback={
        <p className="text-sm text-ink-muted">
          Registrar un cobro requiere el rol admin.
        </p>
      }
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Registrar cobro
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar cobro"
        description={`Faltan ${formatCentavos(outstandingCents)} por cobrar de este pedido.`}
      >
        <form action={action} className="flex flex-col gap-4">
          <ProviderField />
          <AmountField
            label="Importe recibido"
            defaultValue={outstandingCents}
            hint="Puedes registrar un pago parcial."
          />
          <Field name="note" label="Nota (opcional)">
            {(props) => (
              <input {...props} type="text" maxLength={500} placeholder="Pagó con $1000" />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Registrando…' : 'Registrar cobro'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Can>
  );
}

/**
 * Gate P3 made usable: collect and hand over in one move.
 *
 * Blocking `completed` on an unpaid order is right and, alone, cruel — it would
 * send the person at the counter to another screen and back with a customer
 * waiting. One click, two facts, one transaction.
 */
export function SettleAndComplete({
  orderId,
  outstandingCents,
}: {
  orderId: string;
  outstandingCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    settleAndComplete.bind(null, orderId),
    IDLE_RESULT,
  );

  useOutcome(state, () => setOpen(false));

  return (
    <Can
      role="admin"
      fallback={
        <p className="text-sm text-ink-muted">
          Este pedido no se ha cobrado. Cobrarlo y entregarlo requiere el rol
          admin.
        </p>
      }
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Cobrar y entregar
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cobrar y entregar"
        description="Se registra el cobro y el pedido se marca entregado en una sola operación."
      >
        <form action={action} className="flex flex-col gap-4">
          <ProviderField />
          <AmountField label="Importe recibido" defaultValue={outstandingCents} />
          <Field name="note" label="Nota (opcional)">
            {(props) => <input {...props} type="text" maxLength={500} />}
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Procesando…' : 'Cobrar y entregar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Can>
  );
}

const REASONS = [
  { value: 'requested_by_customer', label: 'El cliente lo pidió' },
  { value: 'duplicate', label: 'Cobro duplicado' },
  { value: 'fraudulent', label: 'Cargo fraudulento' },
  { value: 'other', label: 'Otro' },
] as const;

/**
 * Returns money.
 *
 * The four warnings below are not decoration. They are the questions the
 * counter will be asked afterwards, and an operator who reads them before
 * pressing can answer them; one who does not will call the customer back.
 */
export function RefundOrder({
  orderId,
  refundableCents,
  isOnline,
}: {
  orderId: string;
  refundableCents: number;
  isOnline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'full' | 'partial'>('full');
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    refundOrder.bind(null, orderId),
    IDLE_RESULT,
  );

  useOutcome(state, () => setOpen(false));

  return (
    <Can role="admin">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Devolver dinero
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Devolver dinero"
        description={`Quedan ${formatCentavos(refundableCents)} por devolver.`}
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="scope" value={scope} />

          <div className="flex gap-2">
            {(['full', 'partial'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                aria-pressed={scope === value}
                className={`h-9 flex-1 cursor-pointer rounded-md border text-sm font-medium transition-colors ${
                  scope === value
                    ? 'border-brand-600 bg-brand-50 text-brand-600'
                    : 'border-line-strong bg-surface text-ink-muted hover:bg-subtle'
                }`}
              >
                {value === 'full' ? 'Todo' : 'Una parte'}
              </button>
            ))}
          </div>

          {scope === 'partial' ? (
            <AmountField
              label="Importe a devolver"
              defaultValue={refundableCents}
            />
          ) : null}

          <Field name="reason" label="Motivo" required>
            {(props) => (
              <select {...props} defaultValue="requested_by_customer" required>
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            name="note"
            label="Nota"
            hint="Obligatoria si el motivo es «Otro»."
          >
            {(props) => <input {...props} type="text" maxLength={500} />}
          </Field>

          {isOnline ? (
            <ul className="flex list-disc flex-col gap-1 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 pl-7 text-xs text-ink">
              <li>La comisión de procesamiento no se devuelve.</li>
              <li>El dinero vuelve al mismo método con el que se pagó.</li>
              <li>Tarda de 5 a 10 días hábiles en aparecer en su cuenta.</li>
              <li>
                Si se hace poco después del cargo, puede aparecer como anulación
                y no como abono.
              </li>
            </ul>
          ) : (
            <p className="rounded-md border border-line bg-subtle px-3 py-2 text-xs text-ink">
              Este cobro se recibió en la tienda. Entrega el dinero al cliente y
              confirma aquí: el sistema sólo registra el movimiento.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" variant="danger" disabled={pending}>
              {pending ? 'Devolviendo…' : 'Devolver'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Can>
  );
}

/**
 * Gate P4: cancelling an order that holds money.
 *
 * Cancelling is not blocked — the decision about the money is what becomes
 * unavoidable. A shop legitimately keeps a payment sometimes: the customer
 * never came and the fish spoiled. Keeping it *silently* is the thing this
 * dialog exists to prevent, which is why "retener" demands a written reason.
 */
export function CancelWithMoney({
  orderId,
  heldCents,
}: {
  orderId: string;
  heldCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<'refund' | 'keep'>('refund');
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    cancelOrderWithMoney.bind(null, orderId),
    IDLE_RESULT,
  );

  useOutcome(state, () => setOpen(false));

  return (
    <Can role="admin">
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={() => setOpen(true)}
      >
        Cancelar
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancelar pedido"
        description={`Este pedido tiene ${formatCentavos(heldCents)} cobrados. Decide qué pasa con ese dinero.`}
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="decision" value={decision} />

          <div className="flex flex-col gap-2">
            {(
              [
                {
                  value: 'refund' as const,
                  title: 'Devolver el dinero',
                  detail: 'Se cancela el pedido y se reembolsa el total cobrado.',
                },
                {
                  value: 'keep' as const,
                  title: 'Retener el dinero',
                  detail:
                    'Se cancela el pedido y el cobro se queda, con la razón escrita.',
                },
              ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDecision(option.value)}
                aria-pressed={decision === option.value}
                className={`cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors ${
                  decision === option.value
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-line bg-surface hover:bg-subtle'
                }`}
              >
                <span className="block text-sm font-medium text-ink">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {option.detail}
                </span>
              </button>
            ))}
          </div>

          <Field
            name="note"
            label={decision === 'keep' ? 'Razón de la retención' : 'Nota (opcional)'}
            required={decision === 'keep'}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                maxLength={500}
                required={decision === 'keep'}
                placeholder={
                  decision === 'keep'
                    ? 'El cliente no se presentó y el producto se echó a perder'
                    : undefined
                }
              />
            )}
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Volver
            </Button>
            <Button type="submit" size="sm" variant="danger" disabled={pending}>
              {pending ? 'Cancelando…' : 'Cancelar pedido'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Can>
  );
}

/**
 * Turns an order agreed at the counter into one paid online.
 *
 * The bridge between the two paths, and the reason the model has a `paymentMode`
 * on the order rather than only on the attempt: how an order will be paid is an
 * agreement, and agreements change. A 1,400-peso delivery the shop would rather
 * not send uncollected becomes an online order with one click.
 *
 * Uses `ActionRunner` rather than a form: there is nothing to fill in, and the
 * button disappears the moment it succeeds — which is exactly the case
 * `useActionState` loses the result on.
 */
export function SendPaymentLink({ orderId }: { orderId: string }) {
  return (
    <Can role="admin">
      <ActionRunner action={sendPaymentLink.bind(null, orderId, IDLE_RESULT)}>
        {(pending, run) => (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={run}
            disabled={pending}
          >
            {pending ? 'Generando…' : 'Enviar liga de pago'}
          </Button>
        )}
      </ActionRunner>
    </Can>
  );
}

/**
 * Cancels an order with no money on it.
 *
 * Still lives in `PAG` and not in `SAL`: cancelling also closes whatever
 * payment page is open, and Sales is not allowed to know Stripe exists.
 *
 * Cancelling is the one irreversible move on this screen, so it is the one that
 * looks different — everything else advances the order and takes the primary
 * tone.
 */
export function CancelOrder({ orderId }: { orderId: string }) {
  return (
    <Can role="admin">
      <ActionRunner action={cancelOrder.bind(null, orderId)}>
        {(pending, run) => (
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={run}
            disabled={pending}
          >
            {pending ? 'Cancelando…' : 'Cancelar'}
          </Button>
        )}
      </ActionRunner>
    </Can>
  );
}
