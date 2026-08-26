import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
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
      <p className="text-sm text-gray-500">
        Este pedido está cerrado y no admite más cambios.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((next) => (
        <form key={next} action={changeOrderStatus.bind(null, orderId, next)}>
          <button
            type="submit"
            className={
              next === 'cancelled'
                ? 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100'
                : 'rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-500'
            }
          >
            {TRANSITION_LABEL[next]}
          </button>
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
      <p className="text-sm text-gray-500">
        Un pago reembolsado no se puede revertir.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((next) => (
        <form key={next} action={changePaymentStatus.bind(null, orderId, next)}>
          <button
            type="submit"
            className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-gray-100"
          >
            {PAYMENT_TRANSITION_LABEL[next]}
          </button>
        </form>
      ))}
    </div>
  );
}
