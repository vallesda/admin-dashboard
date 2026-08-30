import { describe, expect, it } from 'vitest';

import { projectPaymentStatus } from './projection';

/**
 * The rule that decides whether this shop believes it has been paid.
 *
 * Every case below is one the ledger can actually produce.
 */
const project = (
  paidCents: number,
  refundedCents = 0,
  hasCommittedAttempt = false,
) => projectPaymentStatus({ paidCents, refundedCents, hasCommittedAttempt });

describe('sin dinero recibido', () => {
  it('es «sin pagar» cuando no hay nada en curso', () => {
    expect(project(0)).toBe('unpaid');
  });

  it('es «cobrando» cuando el cliente ya se comprometió', () => {
    // An issued OXXO voucher: the counter needs to know to wait.
    expect(project(0, 0, true)).toBe('processing');
  });

  it('una sesión creada que nadie abrió sigue siendo «sin pagar»', () => {
    // `hasCommittedAttempt` is false for a `created` session on purpose. Calling
    // it "cobrando" would freeze the order for a shopper who never came back.
    expect(project(0, 0, false)).toBe('unpaid');
  });
});

describe('con dinero recibido', () => {
  it('es «pagado» sin devoluciones', () => {
    expect(project(62000)).toBe('paid');
  });

  it('es «reembolso parcial» cuando se devolvió una parte', () => {
    expect(project(62000, 18000)).toBe('partially_refunded');
  });

  it('es «reembolsado» cuando se devolvió todo', () => {
    expect(project(62000, 62000)).toBe('refunded');
  });

  it('un cobro pagado gana a un intento abierto', () => {
    // Paid in cash at the counter while an online voucher was still live. The
    // money that exists beats the money that was promised.
    expect(project(62000, 0, true)).toBe('paid');
  });
});

describe('bordes', () => {
  it('trata una devolución de más como reembolso total, no parcial', () => {
    // Refunds are capped before they are written, but if a Dashboard-issued one
    // ever pushed the total over, "reembolsado" is the honest answer.
    expect(project(62000, 70000)).toBe('refunded');
  });

  it('devolver un centavo menos sigue siendo parcial', () => {
    expect(project(62000, 61999)).toBe('partially_refunded');
  });

  it('un cobro de cero no cuenta como pagado', () => {
    expect(project(0, 0)).toBe('unpaid');
  });

  it('nunca inventa un estado fuera del enum', () => {
    const legal = new Set([
      'unpaid',
      'processing',
      'paid',
      'partially_refunded',
      'refunded',
    ]);

    for (const paid of [0, 1, 100, 62000]) {
      for (const refunded of [0, 1, 100, 62000, 99999]) {
        for (const committed of [true, false]) {
          expect(legal.has(project(paid, refunded, committed))).toBe(true);
        }
      }
    }
  });
});
