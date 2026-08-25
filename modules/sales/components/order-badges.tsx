import {
  ClockIcon,
  CheckIcon,
  FireIcon,
  ShoppingBagIcon,
  XMarkIcon,
  BanknotesIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../state-machine';

const STATUS_ICON = {
  pending: ClockIcon,
  confirmed: CheckIcon,
  preparing: FireIcon,
  ready: ShoppingBagIcon,
  completed: CheckIcon,
  cancelled: XMarkIcon,
} as const;

/**
 * Operational state. Icon plus word, never colour alone: `pending` and
 * `cancelled` are both "not done" but mean opposite things to the shop.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICON[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs',
        {
          'bg-gray-100 text-gray-600': status === 'pending',
          'bg-blue-100 text-blue-800': status === 'confirmed',
          'bg-amber-100 text-amber-900': status === 'preparing',
          'bg-purple-100 text-purple-800': status === 'ready',
          'bg-green-500 text-white': status === 'completed',
          'bg-red-100 text-red-800': status === 'cancelled',
        },
      )}
    >
      {ORDER_STATUS_LABEL[status]}
      <Icon className="w-4" />
    </span>
  );
}

/** Money state — a separate machine, so a separate badge (RN-006). */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const Icon =
    status === 'refunded'
      ? ArrowUturnLeftIcon
      : status === 'paid'
        ? BanknotesIcon
        : ClockIcon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs',
        {
          'bg-gray-100 text-gray-600': status === 'unpaid',
          'bg-green-100 text-green-800': status === 'paid',
          'bg-orange-100 text-orange-800': status === 'refunded',
        },
      )}
    >
      {PAYMENT_STATUS_LABEL[status]}
      <Icon className="w-4" />
    </span>
  );
}
