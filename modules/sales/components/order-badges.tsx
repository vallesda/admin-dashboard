import {
  ClockIcon,
  CheckIcon,
  FireIcon,
  ShoppingBagIcon,
  XMarkIcon,
  BanknotesIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';

import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../state-machine';
import Badge, { type BadgeTone } from '@/app/ui/kit/badge';

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
 *
 * The tones map to what the operator has to DO, which is the only question this
 * badge is answering in a queue of forty orders:
 *
 *   pending    warn     — nobody has confirmed it yet. Needs a person.
 *   confirmed  info     — accepted, moving.
 *   preparing  info     — moving.
 *   ready      warn     — waiting on the *customer*, and it is the shop's job
 *                         to chase it. This is the row that goes stale.
 *   completed  ok       — done.
 *   cancelled  neutral  — closed. Not a failure to act on, and colouring it red
 *                         made a normal outcome look like an incident.
 *
 * The six ad-hoc palettes this replaced used blue, amber, purple, solid green
 * and red with no shared meaning, so `bg-green-500` marked a completed order
 * while `bg-green-100` marked a paid one — two different greens, two different
 * machines, no way to learn either.
 */
const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warn',
  confirmed: 'info',
  preparing: 'info',
  ready: 'warn',
  completed: 'ok',
  cancelled: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} icon={STATUS_ICON[status]}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

/**
 * Money state — a separate machine, so a separate badge (RN-006).
 *
 * `unpaid` is `warn`, not neutral: an unpaid order is money the shop is owed,
 * and the dashboard has a metric card counting them. A refund is `info` — it is
 * a completed action, not an alarm.
 */
const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  unpaid: 'warn',
  // `info`, not `warn`: an issued OXXO voucher is not a problem, it is a wait.
  // The counter needs to read it as "hold on", not as "chase this customer".
  processing: 'info',
  paid: 'ok',
  partially_refunded: 'info',
  refunded: 'info',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const Icon =
    status === 'refunded' || status === 'partially_refunded'
      ? ArrowUturnLeftIcon
      : status === 'processing'
        ? ClockIcon
        : status === 'paid'
          ? BanknotesIcon
        : ClockIcon;

  return (
    <Badge tone={PAYMENT_TONE[status]} icon={Icon}>
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
