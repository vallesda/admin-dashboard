'use client';

/*
 * A Client Component because its buttons run their action through `ActionRunner`, which
 * hands a `pending` flag to a render prop — and a function cannot cross the
 * server/client boundary. Rendering this from a server-side table is still
 * fine: only serialisable props (ids, names, a status string) pass over, and a
 * bound server action is itself a serialisable reference.
 */
import type {
  OrderStatus,
  PaymentStatus,
  PaymentMode,
} from '@/db/schema/sales';
import { Button } from '@/app/ui/button';
import ActionRunner from '@/app/ui/kit/action-runner';
import { changeOrderStatus } from '../actions';
import {
  SettleAndComplete,
  CancelWithMoney,
  CancelOrder,
} from '@/modules/payments/components/money-actions';
import { availableTransitions, TRANSITION_LABEL } from '../state-machine';

/**
 * Buttons for the transitions this order can actually make *right now*.
 *
 * Driven by `availableTransitions`, the same function the service applies, so
 * the panel can never offer a move that is going to be rejected. That was
 * already true of the operational rules; what is new is that the money is part
 * of the question (DOCS/PAGOS.md §7).
 *
 * A blocked move is shown as an explanation rather than hidden. A button that
 * simply vanishes leaves the operator wondering whether the screen is broken;
 * "el pago está en proceso" tells them what to do next, which is wait.
 */
export function OrderStatusActions({
  orderId,
  status,
  paymentStatus,
  paymentMode,
  outstandingCents,
  heldCents,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  /** What is still owed, so "Cobrar y entregar" can pre-fill the amount. */
  outstandingCents: number;
  /** What has been collected, so cancelling knows there is money at stake. */
  heldCents: number;
}) {
  const options = availableTransitions(status, {
    status: paymentStatus,
    mode: paymentMode,
  });

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Este pedido está cerrado y no admite más cambios.
      </p>
    );
  }

  const blocked = options.filter((o) => !o.verdict.allowed);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map(({ to, verdict }) => {
          if (!verdict.allowed) {
            // Gate P3: the refusal comes with the action that resolves it.
            // Blocking the handover without offering the collection would send
            // the counter to another screen with a customer waiting.
            if (to === 'completed') {
              return (
                <SettleAndComplete
                  key={to}
                  orderId={orderId}
                  outstandingCents={outstandingCents}
                />
              );
            }
            return null;
          }

          if (to === 'cancelled') {
            // Gate P4: cancelling an order that holds money is a decision about
            // the money, so it opens a dialog instead of firing straight away.
            // Either way cancellation goes through `PAG`, because it also has
            // to close whatever payment page is still open.
            return heldCents > 0 ? (
              <CancelWithMoney key={to} orderId={orderId} heldCents={heldCents} />
            ) : (
              <CancelOrder key={to} orderId={orderId} />
            );
          }

          return (
            <ActionRunner
              key={to}
              action={changeOrderStatus.bind(null, orderId, to)}
            >
              {(pending, run) => (
                    <Button
                  type="button"
                  onClick={run}
                  size="sm"
                  variant="primary"
                  disabled={pending}
                >
                  {TRANSITION_LABEL[to]}
                </Button>
              )}
            </ActionRunner>
          );
        })}
      </div>

      {blocked.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {blocked.map(({ to, verdict }) => (
            <li key={to} className="text-xs text-ink-muted">
              {!verdict.allowed ? verdict.reason : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
