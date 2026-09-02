import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import {
  EXCLUDED_PAYMENT_METHOD_TYPES,
  INTEGRATION_IDENTIFIER,
  isCancelableIntent,
  methodLabel,
  toRefundStatus,
} from './stripe';

/**
 * The translation layer between Stripe's vocabulary and ours.
 *
 * Small functions, but they are the ones deciding what a customer reads and
 * whether the shop pays a refund fee it did not have to.
 */

describe('toRefundStatus', () => {
  it('pasa los estados que ya son nuestros', () => {
    for (const s of ['pending', 'requires_action', 'succeeded', 'failed', 'canceled'] as const) {
      expect(toRefundStatus(s)).toBe(s);
    }
  });

  it('trata lo desconocido como pendiente, no como exitoso', () => {
    // Pending counts against the balance, so no second refund can go out for
    // the same pesos while we wait to hear. Assuming success would be the
    // expensive mistake here.
    expect(toRefundStatus(null)).toBe('pending');
    expect(toRefundStatus('algo_nuevo')).toBe('pending');
  });
});

describe('isCancelableIntent', () => {
  it('reconoce los estados que se cancelan en vez de reembolsarse', () => {
    // Cancelling an uncompleted intent costs no processing fee; refunding does.
    // This is the OXXO voucher issued and never paid.
    expect(isCancelableIntent('requires_payment_method')).toBe(true);
    expect(isCancelableIntent('requires_action')).toBe(true);
    expect(isCancelableIntent('requires_confirmation')).toBe(true);
    expect(isCancelableIntent('requires_capture')).toBe(true);
  });

  it('no cancela un pago ya cobrado', () => {
    expect(isCancelableIntent('succeeded')).toBe(false);
    expect(isCancelableIntent('canceled')).toBe(false);
  });

  it('falla cerrado ante un estado ausente', () => {
    expect(isCancelableIntent(null)).toBe(false);
    expect(isCancelableIntent(undefined)).toBe(false);
  });
});

describe('methodLabel', () => {
  it('nombra el método como lo diría un cliente', () => {
    expect(methodLabel('card')).toBe('Tarjeta');
    expect(methodLabel('oxxo')).toBe('OXXO');
    expect(methodLabel('customer_balance')).toBe('Transferencia SPEI');
  });

  it('nunca filtra el nombre del proveedor', () => {
    // "Stripe" is a supplier the shop deals with, not something a customer paid
    // with — and the storefront must never learn the provider's name at all.
    for (const type of ['card', 'oxxo', 'customer_balance', 'link', 'algo_raro', null]) {
      expect(methodLabel(type).toLowerCase()).not.toContain('stripe');
    }
  });

  it('cae en una etiqueta genérica y legible ante un método nuevo', () => {
    expect(methodLabel('metodo_que_no_existe_aun')).toBe('Pago en línea');
    expect(methodLabel(null)).toBe('Pago en línea');
  });
});

describe('política de métodos de pago', () => {
  it('excluye exactamente los métodos de notificación diferida', () => {
    // No es "sólo tarjeta": es "nada que nos pague mañana". Las carteras
    // (Apple Pay, Google Pay, Link) llegan solas por métodos dinámicos y
    // liquidan al instante, así que no tienen por qué estar aquí.
    expect([...EXCLUDED_PAYMENT_METHOD_TYPES].sort()).toEqual([
      'customer_balance',
      'oxxo',
    ]);
  });

  it('no vuelve a fijar la lista de métodos a mano', () => {
    // `payment_method_types` es el parámetro que congela el checkout en el
    // deploy. Que no reaparezca en el archivo es la prueba barata de que no
    // volvió a colarse.
    const source = readFileSync(new URL('./stripe.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/(?<!excluded_)payment_method_types:/);
  });

  it('etiqueta la integración con un sufijo estable de ocho letras', () => {
    // Estable, no aleatorio por petición: un valor nuevo en cada sesión pondría
    // cada pago en un grupo de uno y el Dashboard no reportaría nada.
    expect(INTEGRATION_IDENTIFIER).toMatch(/^[a-z0-9-]+-[a-z]{8}$/);
  });
});
