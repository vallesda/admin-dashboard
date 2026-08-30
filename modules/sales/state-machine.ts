/**
 * SAL — Order state policy. Pure: no database, no session, no `server-only`.
 *
 * Separate from `service.ts` so the rules can be tested without a transaction
 * and read from a component deciding which buttons to render. A UI that offers
 * a transition the service will reject is a UI that lies.
 *
 * DOCS/MODELO-DATOS.md §8 and §9.
 */
import type {
  OrderStatus,
  PaymentStatus,
  PaymentMode,
} from '@/db/schema/sales';

/**
 * Operational transitions (TR-ORD-01…08).
 *
 * The happy path advances one step at a time; cancellation is available from
 * every open state. Nothing leaves `completed` or `cancelled` (INV-ORD-04).
 */
export const LEGAL_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

/** Verb for the button that performs the transition, not the state's name. */
export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  pending: 'Reabrir',
  confirmed: 'Confirmar',
  preparing: 'Preparar',
  ready: 'Marcar listo',
  completed: 'Completar',
  cancelled: 'Cancelar',
};

export function isTerminal(status: OrderStatus): boolean {
  return LEGAL_TRANSITIONS[status].length === 0;
}

/**
 * Fails closed: an unknown status has no legal moves rather than all of them.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return LEGAL_TRANSITIONS[from] ?? [];
}

/** Statuses that still hold a stock reservation. */
export function holdsReservation(status: OrderStatus): boolean {
  return (
    status === 'pending' ||
    status === 'confirmed' ||
    status === 'preparing' ||
    status === 'ready'
  );
}

// ---------------------------------------------------------------------------
// Payment — an independent machine (RN-006, INV-ORD-07)
// ---------------------------------------------------------------------------

/**
 * `unpaid → processing → paid → partially_refunded → refunded`.
 *
 * Two moves go backwards and both are corrections, not reversals:
 * `processing → unpaid` is an expired OXXO voucher — the order really is
 * unpaid again — and `paid → unpaid` is a payment that failed after the fact.
 *
 * `refunded` stays terminal. A refund is a thing that happened; un-refunding it
 * would erase money history rather than correct it. Charging again is a new
 * `Payment`, not a step back.
 *
 * NOTE: this machine is no longer driven by hand. `paymentStatus` is a
 * projection of the `payments`/`refunds` ledger (DOCS/PAGOS.md §6), recomputed
 * inside the transaction that writes to it. These transitions are what the
 * projection is allowed to produce, and the check that catches an impossible
 * recomputation before it reaches the column.
 */
export const LEGAL_PAYMENT_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  unpaid: ['processing', 'paid'],
  processing: ['unpaid', 'paid'],
  paid: ['unpaid', 'partially_refunded', 'refunded'],
  partially_refunded: ['refunded'],
  refunded: [],
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Sin pagar',
  processing: 'Cobrando',
  paid: 'Pagado',
  partially_refunded: 'Reembolso parcial',
  refunded: 'Reembolsado',
};

export const PAYMENT_TRANSITION_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Marcar sin pagar',
  processing: 'Marcar en proceso',
  paid: 'Registrar cobro',
  partially_refunded: 'Reembolso parcial',
  refunded: 'Marcar reembolsado',
};

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  return LEGAL_PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextPaymentStatuses(
  from: PaymentStatus,
): readonly PaymentStatus[] {
  return LEGAL_PAYMENT_TRANSITIONS[from] ?? [];
}

/** Money is actually in the account for at least part of this order. */
export function isSettled(status: PaymentStatus): boolean {
  return (
    status === 'paid' ||
    status === 'partially_refunded' ||
    status === 'refunded'
  );
}

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  online: 'Pago en línea',
  on_site: 'Pago al recibir',
};

// ---------------------------------------------------------------------------
// The gates — where the two machines consult each other (DOCS/PAGOS.md §7)
// ---------------------------------------------------------------------------

/**
 * `RN-006` says the operational and money machines are independent, and it
 * stays true: neither one drags the other along. What follows are the four
 * moments where one of them *asks* the other before letting a move through.
 * Without them, "independent" decays into "disconnected", which is what allows
 * fish to leave the shop unpaid.
 *
 * - **P1** An `online` order cannot be advanced by hand while unpaid. Confirming
 *   means "start cutting", and doing that before the money arrives turns every
 *   abandoned cart into filleted fish nobody ordered. The payment advances it.
 * - **P2** An `on_site` order moves freely up to `ready`. That is the phone
 *   order this shop has always taken; requiring payment first would break the
 *   business that already works.
 * - **P3** Nothing reaches `completed` without a recorded collection. This is
 *   the simplest rule at any counter and the panel does not know it today.
 * - **P4** Cancelling an order that holds money forces a decision about the
 *   refund. Keeping it is sometimes legitimate — the customer never showed and
 *   the fish spoiled — but keeping it *silently* is not.
 */
export type GateVerdict =
  | { allowed: true; requiresConfirmation?: string }
  | { allowed: false; reason: string };

export function canTransitionWithPayment(
  from: OrderStatus,
  to: OrderStatus,
  payment: { status: PaymentStatus; mode: PaymentMode },
): GateVerdict {
  if (!canTransition(from, to)) {
    return {
      allowed: false,
      reason: `Un pedido ${ORDER_STATUS_LABEL[from].toLowerCase()} no puede pasar a ${ORDER_STATUS_LABEL[to].toLowerCase()}.`,
    };
  }

  // P4 — cancelling with money on the table.
  if (to === 'cancelled') {
    if (payment.status === 'paid' || payment.status === 'partially_refunded') {
      return {
        allowed: true,
        requiresConfirmation:
          'Este pedido tiene un cobro registrado. Decide si devuelves el dinero o lo retienes con una nota.',
      };
    }
    return { allowed: true };
  }

  // P3 — no goods leave without a collection.
  if (to === 'completed') {
    if (!isSettled(payment.status)) {
      return {
        allowed: false,
        reason:
          'No se puede entregar un pedido sin cobro registrado. Usa «Cobrar y entregar».',
      };
    }
    if (payment.status === 'refunded') {
      return {
        allowed: false,
        reason:
          'Este pedido está reembolsado por completo. Cancélalo en lugar de completarlo.',
      };
    }
    return { allowed: true };
  }

  // P1 / P2 — advancing an open order.
  if (payment.status === 'processing') {
    return {
      allowed: false,
      reason:
        'El cobro está en proceso. Un vale emitido no es dinero: espera la confirmación del pago.',
    };
  }

  if (payment.status === 'unpaid' && payment.mode === 'online') {
    return {
      allowed: false,
      reason:
        'Este pedido se paga en línea y todavía no se ha cobrado. El pago lo confirma automáticamente.',
    };
  }

  if (payment.status === 'refunded') {
    return {
      allowed: true,
      requiresConfirmation:
        'Este pedido ya fue reembolsado. Avanzarlo significa que se entregará sin cobro.',
    };
  }

  return { allowed: true };
}

/**
 * The operational moves the panel should offer, given the money.
 *
 * The component that draws the buttons calls this, and the service applies
 * `canTransitionWithPayment` again. Same rule, two places, because a UI that
 * offers a transition the service will reject is a UI that lies — and a service
 * that trusts the UI is not a service.
 */
export function availableTransitions(
  from: OrderStatus,
  payment: { status: PaymentStatus; mode: PaymentMode },
): { to: OrderStatus; verdict: GateVerdict }[] {
  return nextStatuses(from).map((to) => ({
    to,
    verdict: canTransitionWithPayment(from, to, payment),
  }));
}
