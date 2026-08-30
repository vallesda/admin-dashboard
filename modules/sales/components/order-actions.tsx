'use client';

/*
 * A Client Component because its buttons run their action through `ActionRunner`, which
 * hands a `pending` flag to a render prop — and a function cannot cross the
 * server/client boundary. Rendering this from a server-side table is still
 * fine: only serialisable props (ids, names, a status string) pass over, and a
 * bound server action is itself a serialisable reference.
 */
import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
import { Button } from '@/app/ui/button';
import ActionRunner from '@/app/ui/kit/action-runner';
import { changeOrderStatus, changePaymentStatus } from '../actions';
import { Can } from '@/app/ui/kit/role';
import {
  nextStatuses,
  nextPaymentStatuses,
  TRANSITION_LABEL,
  PAYMENT_TRANSITION_LABEL,
} from '../state-machine';

/**
 * Buttons for the transitions this order can actually make.
 *
 * Driven by the same policy the service enforces, so the UI can never offer a
 * move that is going to be rejected. A terminal order renders nothing.
 */
export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const options = nextStatuses(status);

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Este pedido está cerrado y no admite más cambios.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((next) => (
        <ActionRunner
          key={next}
          action={changeOrderStatus.bind(null, orderId, next)}
        >
          {(pending, run) => (
            /* Cancelling is the one irreversible move on this screen, so it is
               the one that looks different. Everything else advances the order
               and takes the primary tone. */
            <Button
              type="button"
              onClick={run}
              size="sm"
              variant={next === 'cancelled' ? 'danger' : 'primary'}
              disabled={pending}
            >
              {TRANSITION_LABEL[next]}
            </Button>
          )}
        </ActionRunner>
      ))}
    </div>
  );
}

/**
 * Money moves at `admin` (see `changePaymentStatus`). A `staff` sees the state
 * on the badge above but is not offered the transitions.
 */
export function PaymentStatusActions({
  orderId,
  paymentStatus,
}: {
  orderId: string;
  paymentStatus: PaymentStatus;
}) {
  const options = nextPaymentStatuses(paymentStatus);

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Un pago reembolsado no se puede revertir.
      </p>
    );
  }

  return (
    <Can
      role="admin"
      fallback={
        <p className="text-sm text-ink-muted">
          Registrar un cobro o un reembolso requiere el rol admin.
        </p>
      }
    >
      <div className="flex flex-wrap gap-2">
        {options.map((next) => (
          <ActionRunner
            key={next}
            action={changePaymentStatus.bind(null, orderId, next)}
          >
            {(pending, run) => (
              <Button
                type="button"
                onClick={run}
                size="sm"
                variant="secondary"
                disabled={pending}
              >
                {PAYMENT_TRANSITION_LABEL[next]}
              </Button>
            )}
          </ActionRunner>
        ))}
      </div>
    </Can>
  );
}
