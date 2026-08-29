import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
import { Button } from '@/app/ui/button';
import { changeOrderStatus, changePaymentStatus } from '../actions';
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
        <form key={next} action={changeOrderStatus.bind(null, orderId, next)}>
          {/* Cancelling is the one irreversible move on this screen, so it is
              the one that looks different. Everything else advances the order
              and takes the primary tone. */}
          <Button
            type="submit"
            size="sm"
            variant={next === 'cancelled' ? 'danger' : 'primary'}
          >
            {TRANSITION_LABEL[next]}
          </Button>
        </form>
      ))}
    </div>
  );
}

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
    <div className="flex flex-wrap gap-2">
      {options.map((next) => (
        <form key={next} action={changePaymentStatus.bind(null, orderId, next)}>
          <Button type="submit" size="sm" variant="secondary">
            {PAYMENT_TRANSITION_LABEL[next]}
          </Button>
        </form>
      ))}
    </div>
  );
}
