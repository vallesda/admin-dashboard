import { describe, expect, it } from 'vitest';

import {
  canTransition,
  canTransitionWithPayment,
  availableTransitions,
  isSettled,
  holdsReservation,
  LEGAL_TRANSITIONS,
  LEGAL_PAYMENT_TRANSITIONS,
} from './state-machine';
import type { OrderStatus, PaymentStatus, PaymentMode } from '@/db/schema/sales';

/**
 * The gates from DOCS/PAGOS.md §7.
 *
 * These are the rules that decide whether fish leaves the shop unpaid, so they
 * are the first thing in this repository to get a test. Every case below is a
 * situation the counter can actually reach.
 */

const gate = (
  from: OrderStatus,
  to: OrderStatus,
  status: PaymentStatus,
  mode: PaymentMode = 'on_site',
) => canTransitionWithPayment(from, to, { status, mode });

describe('P1 — un pedido en línea no avanza a mano sin pagar', () => {
  it('bloquea confirmar un pedido online sin cobro', () => {
    const verdict = gate('pending', 'confirmed', 'unpaid', 'online');

    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({
      reason: expect.stringContaining('se paga en línea'),
    });
  });

  it('bloquea también preparar y marcar listo', () => {
    expect(gate('confirmed', 'preparing', 'unpaid', 'online').allowed).toBe(false);
    expect(gate('preparing', 'ready', 'unpaid', 'online').allowed).toBe(false);
  });

  it('deja avanzar en cuanto el pago entra', () => {
    expect(gate('pending', 'confirmed', 'paid', 'online').allowed).toBe(true);
    expect(gate('confirmed', 'preparing', 'paid', 'online').allowed).toBe(true);
  });

  it('bloquea mientras el cobro está en proceso, sea cual sea el modo', () => {
    // An issued OXXO voucher is a promise, not pesos. This is the case the
    // `processing` state was added for.
    for (const mode of ['online', 'on_site'] as const) {
      const verdict = gate('pending', 'confirmed', 'processing', mode);
      expect(verdict.allowed).toBe(false);
      expect(verdict).toMatchObject({
        reason: expect.stringContaining('vale emitido no es dinero'),
      });
    }
  });
});

describe('P2 — un pedido de mostrador avanza sin pagar', () => {
  it('permite todo el camino hasta listo', () => {
    expect(gate('pending', 'confirmed', 'unpaid').allowed).toBe(true);
    expect(gate('confirmed', 'preparing', 'unpaid').allowed).toBe(true);
    expect(gate('preparing', 'ready', 'unpaid').allowed).toBe(true);
  });

  it('no pide confirmación para ninguno de esos pasos', () => {
    const verdict = gate('confirmed', 'preparing', 'unpaid');
    expect(verdict.allowed && verdict.requiresConfirmation).toBeUndefined();
  });
});

describe('P3 — nada se entrega sin cobro registrado', () => {
  it('bloquea completar sin pago y señala la salida', () => {
    const verdict = gate('ready', 'completed', 'unpaid');

    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({
      reason: expect.stringContaining('Cobrar y entregar'),
    });
  });

  it('bloquea completar mientras el cobro está en proceso', () => {
    expect(gate('ready', 'completed', 'processing').allowed).toBe(false);
  });

  it('permite completar cobrado', () => {
    expect(gate('ready', 'completed', 'paid').allowed).toBe(true);
  });

  it('permite completar con reembolso parcial', () => {
    // Two kilos ordered, one and a half arrived, the difference returned. The
    // order is as closed as it can be.
    expect(gate('ready', 'completed', 'partially_refunded').allowed).toBe(true);
  });

  it('bloquea completar un pedido reembolsado por completo', () => {
    const verdict = gate('ready', 'completed', 'refunded');

    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({
      reason: expect.stringContaining('Cancélalo'),
    });
  });
});

describe('P4 — cancelar con dinero cobrado exige decidir', () => {
  it('pide confirmación cuando hay cobro', () => {
    const verdict = gate('confirmed', 'cancelled', 'paid');

    expect(verdict.allowed).toBe(true);
    expect(verdict).toMatchObject({
      requiresConfirmation: expect.stringContaining('cobro registrado'),
    });
  });

  it('pide confirmación también con reembolso parcial', () => {
    const verdict = gate('preparing', 'cancelled', 'partially_refunded');
    expect(verdict.allowed && verdict.requiresConfirmation).toBeTruthy();
  });

  it('cancela sin fricción cuando no hay dinero de por medio', () => {
    const verdict = gate('pending', 'cancelled', 'unpaid');

    expect(verdict.allowed).toBe(true);
    expect(verdict.allowed && verdict.requiresConfirmation).toBeUndefined();
  });

  it('permite cancelar en cualquier estado abierto', () => {
    for (const from of ['pending', 'confirmed', 'preparing', 'ready'] as const) {
      expect(gate(from, 'cancelled', 'unpaid').allowed).toBe(true);
    }
  });
});

describe('la contradicción legítima: avanzar algo ya reembolsado', () => {
  it('se permite, pero pidiendo confirmación', () => {
    // Refunded as a courtesy and delivered anyway is a real case. Forbidding it
    // would leave the operator with no way out; allowing it silently would hide
    // a mistake. So: allowed, confirmed, recorded.
    const verdict = gate('confirmed', 'preparing', 'refunded');

    expect(verdict.allowed).toBe(true);
    expect(verdict).toMatchObject({
      requiresConfirmation: expect.stringContaining('sin cobro'),
    });
  });
});

describe('las puertas nunca amplían la máquina operativa', () => {
  it('rechaza cualquier salto ilegal, con o sin dinero', () => {
    const statuses: OrderStatus[] = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ];
    const payments: PaymentStatus[] = [
      'unpaid',
      'processing',
      'paid',
      'partially_refunded',
      'refunded',
    ];

    for (const from of statuses) {
      for (const to of statuses) {
        if (canTransition(from, to)) continue;

        for (const status of payments) {
          for (const mode of ['online', 'on_site'] as const) {
            // A transition the operational machine forbids must stay forbidden
            // no matter what the money says. The gates only ever subtract.
            expect(gate(from, to, status, mode).allowed).toBe(false);
          }
        }
      }
    }
  });

  it('deja los estados terminales cerrados', () => {
    expect(LEGAL_TRANSITIONS.completed).toHaveLength(0);
    expect(LEGAL_TRANSITIONS.cancelled).toHaveLength(0);
  });
});

describe('availableTransitions — lo que el panel dibuja', () => {
  it('coincide con lo que el servicio aplicaría', () => {
    const options = availableTransitions('ready', {
      status: 'unpaid',
      mode: 'on_site',
    });

    // The UI must not offer a move the service rejects, and must not hide one
    // it would accept. Same function, both sides.
    for (const { to, verdict } of options) {
      expect(verdict).toEqual(
        canTransitionWithPayment('ready', to, {
          status: 'unpaid',
          mode: 'on_site',
        }),
      );
    }
  });

  it('no devuelve nada para un pedido cerrado', () => {
    expect(
      availableTransitions('completed', { status: 'paid', mode: 'on_site' }),
    ).toHaveLength(0);
  });
});

describe('la máquina de pago', () => {
  it('trata reembolsado como terminal', () => {
    expect(LEGAL_PAYMENT_TRANSITIONS.refunded).toHaveLength(0);
  });

  it('sabe qué estados implican dinero recibido', () => {
    expect(isSettled('unpaid')).toBe(false);
    expect(isSettled('processing')).toBe(false);
    expect(isSettled('paid')).toBe(true);
    expect(isSettled('partially_refunded')).toBe(true);
    expect(isSettled('refunded')).toBe(true);
  });
});

describe('holdsReservation', () => {
  it('cubre exactamente los estados abiertos', () => {
    expect(holdsReservation('pending')).toBe(true);
    expect(holdsReservation('confirmed')).toBe(true);
    expect(holdsReservation('preparing')).toBe(true);
    expect(holdsReservation('ready')).toBe(true);
    expect(holdsReservation('completed')).toBe(false);
    expect(holdsReservation('cancelled')).toBe(false);
  });
});
