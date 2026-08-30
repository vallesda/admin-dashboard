import {
  BanknotesIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { formatCentavos } from '@/lib/money';
import type { PaymentStatus, PaymentMode } from '@/db/schema/sales';
import { PAYMENT_STATUS_LABEL } from '@/modules/sales/state-machine';
import {
  listPaymentsForOrder,
  listRefundsForOrder,
  moneySummary,
} from '../queries';
import { methodLabel } from '../stripe';
import { RecordPayment, RefundOrder, SendPaymentLink } from './money-actions';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City',
});

/**
 * The money side of one order: what came in, what went back, and who moved it.
 *
 * A ledger rather than a status line. `orders.paymentStatus` is a projection of
 * exactly these rows (DOCS/PAGOS.md §6), so showing the badge without the rows
 * behind it would be showing a conclusion with no evidence — which is the state
 * this panel was built to leave behind.
 *
 * Chronological, oldest first, because it reads as a story: the voucher was
 * issued, then it was paid, then half of it came back.
 */
export default async function MoneyPanel({
  orderId,
  totalCents,
  paymentStatus,
  paymentMode,
  isClosed,
}: {
  orderId: string;
  totalCents: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  /** A completed or cancelled order takes no new collections. */
  isClosed: boolean;
}) {
  const [entries, refundRows, summary] = await Promise.all([
    listPaymentsForOrder(orderId),
    listRefundsForOrder(orderId),
    moneySummary(orderId),
  ]);

  const outstandingCents = Math.max(0, totalCents - summary.paidCents);
  const refundableCents = Math.max(0, summary.paidCents - summary.refundedCents);
  const settled = entries.filter((e) => e.status === 'succeeded');
  const isOnline = settled.some((e) => e.provider === 'stripe');

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3 rounded-md border border-line bg-subtle px-3 py-2.5">
        <Figure label="Total" value={formatCentavos(totalCents)} />
        <Figure label="Cobrado" value={formatCentavos(summary.paidCents)} />
        <Figure
          label={summary.refundedCents > 0 ? 'Devuelto' : 'Por cobrar'}
          value={formatCentavos(
            summary.refundedCents > 0 ? summary.refundedCents : outstandingCents,
          )}
          tone={
            summary.refundedCents > 0
              ? 'muted'
              : outstandingCents > 0
                ? 'warn'
                : 'muted'
          }
        />
      </dl>

      {summary.hasFailedRefund ? (
        /* A failed refund is a human problem, not a log line: the customer is
           still owed money and nobody will find out from a console. */
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Un reembolso falló y el dinero volvió a la cuenta de la tienda. Hay que
          acordar otra forma de devolvérselo al cliente.
        </p>
      ) : null}

      {entries.length === 0 && refundRows.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {paymentMode === 'online'
            ? 'Este pedido se paga en línea y todavía no hay ningún intento de cobro.'
            : 'Todavía no se ha registrado ningún cobro.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-2.5 rounded-md border border-line px-3 py-2"
            >
              <BanknotesIcon
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  <span className="font-medium">
                    {formatCentavos(entry.amountCents)}
                  </span>{' '}
                  · {providerLabel(entry.provider, entry.paymentMethodType)}
                  {entry.status !== 'succeeded' ? (
                    <span className="text-ink-muted">
                      {' '}
                      · {ATTEMPT_LABEL[entry.status]}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {dateFormat.format(entry.paidAt ?? entry.createdAt)}
                  {/* NULL author means a provider confirmed it, not a person.
                      Saying so is what keeps the ledger honest about who is
                      answerable for each line. */}
                  {' · '}
                  {entry.actorName ?? 'Confirmado por el proveedor'}
                </p>
                {entry.hostedVoucherUrl && entry.status === 'processing' ? (
                  <a
                    href={entry.hostedVoucherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-brand-600 underline underline-offset-2"
                  >
                    Ver el vale de pago
                    {entry.expiresAt
                      ? ` · vence el ${dateFormat.format(entry.expiresAt)}`
                      : ''}
                  </a>
                ) : null}
                {entry.note ? (
                  <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">
                    {entry.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}

          {refundRows.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-2.5 rounded-md border border-line px-3 py-2"
            >
              <ArrowUturnLeftIcon
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">
                  <span className="font-medium">
                    −{formatCentavos(row.amountCents)}
                  </span>{' '}
                  · Reembolso
                  {row.status !== 'succeeded' ? (
                    <span
                      className={
                        row.status === 'failed'
                          ? ' font-medium text-danger'
                          : ' text-ink-muted'
                      }
                    >
                      {' '}
                      · {REFUND_LABEL[row.status]}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {dateFormat.format(row.createdAt)} ·{' '}
                  {row.actorName ?? 'Desde el Dashboard de Stripe'}
                </p>
                {row.note ? (
                  <p className="mt-1 text-xs text-ink-muted">{row.note}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {outstandingCents > 0 && !isClosed ? (
          <RecordPayment orderId={orderId} outstandingCents={outstandingCents} />
        ) : null}

        {/* Only offered where it makes sense: an order still owed money that is
            not already waiting on a payment of its own. Showing it beside a
            live OXXO voucher would give the customer two references for one
            order and nobody a way to know which one the shop is waiting on. */}
        {outstandingCents > 0 && !isClosed && paymentStatus !== 'processing' ? (
          <SendPaymentLink orderId={orderId} />
        ) : null}

        {refundableCents > 0 ? (
          <RefundOrder
            orderId={orderId}
            refundableCents={refundableCents}
            isOnline={isOnline}
          />
        ) : null}

        {outstandingCents === 0 && refundableCents === 0 ? (
          <p className="text-sm text-ink-muted">
            {PAYMENT_STATUS_LABEL[paymentStatus]}. No queda dinero por mover.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: string;
  tone?: 'muted' | 'warn';
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-medium tabular-nums ${
          tone === 'warn' ? 'text-warn' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A manual provider names itself; Stripe names the method the customer chose.
 *
 * "Stripe" is a supplier the shop deals with, not a thing a customer paid with.
 * "Tarjeta" and "OXXO" are what appears on the ticket and what the person on
 * the phone will say.
 */
function providerLabel(
  provider: string,
  methodType: string | null,
): string {
  switch (provider) {
    case 'cash':
      return 'Efectivo';
    case 'terminal':
      return 'Terminal';
    case 'transfer':
      return 'Transferencia';
    default:
      return methodLabel(methodType);
  }
}

const ATTEMPT_LABEL: Record<string, string> = {
  created: 'sin abrir',
  processing: 'esperando el pago',
  failed: 'falló',
  expired: 'venció',
  canceled: 'cancelado',
};

const REFUND_LABEL: Record<string, string> = {
  pending: 'en proceso',
  requires_action: 'esperando datos del cliente',
  failed: 'falló',
  canceled: 'cancelado',
};
