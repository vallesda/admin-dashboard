import { describe, expect, it } from 'vitest';

import {
  cancelWithMoneySchema,
  recordPaymentSchema,
  refundSchema,
} from './validators';

/** The first field error, which is what the action surfaces as a toast. */
const firstError = (result: { success: boolean; error?: unknown }) => {
  if (result.success) return null;
  const flat = (result.error as { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }).flatten();
  return Object.values(flat.fieldErrors).flat().filter(Boolean)[0] ?? null;
};

describe('recordPaymentSchema', () => {
  it('convierte pesos a centavos', () => {
    const r = recordPaymentSchema.safeParse({
      provider: 'cash',
      amountCents: '349.50',
      note: null,
    });

    expect(r.success && r.data.amountCents).toBe(34950);
  });

  it('rechaza stripe como método manual', () => {
    // An online charge is written by the webhook from what Stripe reports.
    // Typing one in by hand would put a claim in the ledger that no
    // reconciliation could ever settle.
    const r = recordPaymentSchema.safeParse({
      provider: 'stripe',
      amountCents: '100',
      note: null,
    });

    expect(r.success).toBe(false);
  });

  it('rechaza importes de cero o negativos', () => {
    expect(
      recordPaymentSchema.safeParse({ provider: 'cash', amountCents: '0', note: null })
        .success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ provider: 'cash', amountCents: '-50', note: null })
        .success,
    ).toBe(false);
  });

  it('convierte una nota vacía en null', () => {
    const r = recordPaymentSchema.safeParse({
      provider: 'terminal',
      amountCents: '10',
      note: '   ',
    });

    expect(r.success && r.data.note).toBeNull();
  });
});

describe('refundSchema', () => {
  it('acepta devolver todo sin importe', () => {
    const r = refundSchema.safeParse({
      scope: 'full',
      reason: 'requested_by_customer',
      note: null,
    });

    expect(r.success).toBe(true);
  });

  it('exige importe cuando se devuelve una parte', () => {
    const r = refundSchema.safeParse({
      scope: 'partial',
      reason: 'requested_by_customer',
      note: null,
    });

    expect(r.success).toBe(false);
    expect(firstError(r)).toContain('cuánto');
  });

  it('exige nota cuando el motivo es «Otro»', () => {
    // A money movement someone will have to justify months from now. "Other"
    // with no explanation is the same as no reason at all.
    const r = refundSchema.safeParse({
      scope: 'full',
      reason: 'other',
      note: null,
    });

    expect(r.success).toBe(false);
    expect(firstError(r)).toContain('Explica el motivo');
  });

  it('acepta «Otro» con nota', () => {
    const r = refundSchema.safeParse({
      scope: 'full',
      reason: 'other',
      note: 'El producto llegó en mal estado',
    });

    expect(r.success).toBe(true);
  });
});

describe('cancelWithMoneySchema — puerta P4', () => {
  it('exige razón escrita para retener el dinero', () => {
    const r = cancelWithMoneySchema.safeParse({ decision: 'keep', note: null });

    expect(r.success).toBe(false);
    expect(firstError(r)).toContain('por qué se retiene');
  });

  it('no exige nota para devolver', () => {
    expect(
      cancelWithMoneySchema.safeParse({ decision: 'refund', note: null }).success,
    ).toBe(true);
  });

  it('rechaza una decisión que no es ninguna de las dos', () => {
    expect(
      cancelWithMoneySchema.safeParse({ decision: 'ignore', note: 'x' }).success,
    ).toBe(false);
  });
});
