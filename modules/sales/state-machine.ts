/**
 * SAL — Order state policy. Pure: no database, no session, no `server-only`.
 *
 * Separate from `service.ts` so the rules can be tested without a transaction
 * and read from a component deciding which buttons to render. A UI that offers
 * a transition the service will reject is a UI that lies.
 *
 * DOCS/MODELO-DATOS.md §8 and §9.
 */
import type { OrderStatus, PaymentStatus } from '@/db/schema/sales';

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
 * `unpaid → paid → refunded`, one way.
 *
 * `refunded → paid` is deliberately impossible: a refund is a fact that
 * happened, and un-refunding it would erase money history rather than correct
 * it. Charging again is a new payment, which is what `Payment` will model
 * post-MVP (DOCS §10).
 */
export const LEGAL_PAYMENT_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  unpaid: ['paid'],
  paid: ['refunded'],
  refunded: [],
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Sin pagar',
  paid: 'Pagado',
  refunded: 'Reembolsado',
};

export const PAYMENT_TRANSITION_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Marcar sin pagar',
  paid: 'Marcar pagado',
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
