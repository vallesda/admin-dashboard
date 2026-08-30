/**
 * PAG — input validation.
 *
 * Messages are user-facing, so they are in Spanish (DOCS/README.md
 * "Lenguaje del código": UI in Spanish, identifiers in English).
 */
import { z } from 'zod';

import { parsePesosToCentavos } from '@/lib/money';

/**
 * An amount typed in pesos, stored in centavos (RN-002).
 *
 * Reused by both the collection and the refund forms, so the two can never
 * disagree about what "180.50" means.
 */
const amountCents = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => {
    const centavos = parsePesosToCentavos(value);

    if (centavos === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe un importe válido. Ejemplo: 349.00',
      });
      return z.NEVER;
    }

    return centavos;
  })
  .pipe(
    z
      .number()
      .int()
      .positive({ message: 'El importe debe ser mayor a $0.00.' })
      .max(99_999_999, { message: 'El importe es demasiado alto.' }),
  );

const note = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s === '' ? null : s;
  })
  .refine((v) => v === null || v.length <= 500, {
    message: 'La nota no puede pasar de 500 caracteres.',
  });

/**
 * Recording money taken by a person.
 *
 * `stripe` is absent from the enum on purpose: a Stripe payment is written by
 * the webhook from what Stripe reports, never typed into a form. Letting an
 * operator declare a card charge that Stripe never saw would put a lie in the
 * ledger that reconciliation could not resolve.
 */
export const recordPaymentSchema = z.object({
  provider: z.enum(['cash', 'terminal', 'transfer'], {
    errorMap: () => ({ message: 'Elige cómo se recibió el dinero.' }),
  }),
  amountCents,
  note,
});

/** The refund form. `full` is a separate flag so "todo" survives a rounding. */
export const refundSchema = z
  .object({
    scope: z.enum(['full', 'partial'], {
      errorMap: () => ({ message: 'Elige si devuelves todo o una parte.' }),
    }),
    amountCents: amountCents.optional(),
    reason: z.enum(
      ['requested_by_customer', 'duplicate', 'fraudulent', 'other'],
      { errorMap: () => ({ message: 'Elige un motivo.' }) },
    ),
    note,
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'partial' && data.amountCents === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amountCents'],
        message: 'Escribe cuánto vas a devolver.',
      });
    }

    // "Other" with no explanation is the same as no reason at all, and this is
    // a money movement someone will have to justify months from now.
    if (data.reason === 'other' && data.note === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Explica el motivo cuando elijas «Otro».',
      });
    }
  });

/** Cancelling an order that holds money (gate P4). */
export const cancelWithMoneySchema = z
  .object({
    decision: z.enum(['refund', 'keep'], {
      errorMap: () => ({ message: 'Decide qué pasa con el dinero cobrado.' }),
    }),
    note,
  })
  .superRefine((data, ctx) => {
    if (data.decision === 'keep' && data.note === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Escribe por qué se retiene el dinero.',
      });
    }
  });

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type CancelWithMoneyInput = z.infer<typeof cancelWithMoneySchema>;
