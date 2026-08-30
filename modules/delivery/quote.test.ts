import { describe, expect, it } from 'vitest';

import { applyWaiver, quoteDelivery, quoteLabel } from './quote';

const centro = {
  id: 'zone-1',
  name: 'Centro',
  feeCents: 5000,
  freeOverCents: 80000,
};

const sinUmbral = { ...centro, id: 'zone-2', name: 'Periferia', freeOverCents: null };

describe('fuera de cobertura', () => {
  it('un código postal sin zona no es «envío gratis»', () => {
    // La distinción entera del módulo: no llegamos ahí ≠ cuesta cero.
    const q = quoteDelivery(null, 100000);

    expect(q.covered).toBe(false);
    expect(q).toMatchObject({ reason: 'out_of_range' });
  });

  it('lo dice con palabras que un comprador entiende', () => {
    expect(quoteLabel(quoteDelivery(undefined, 0))).toContain('No hacemos entregas');
  });
});

describe('tarifa de zona', () => {
  it('cobra la tarifa cuando no se alcanza el umbral', () => {
    const q = quoteDelivery(centro, 62000);

    expect(q).toMatchObject({
      covered: true,
      feeCents: 5000,
      reason: 'zone',
      zoneName: 'Centro',
    });
  });

  it('dice cuánto falta para que salga gratis', () => {
    const q = quoteDelivery(centro, 62000);
    expect(q.covered && q.missingForFreeCents).toBe(18000);
  });

  it('no promete gratis en una zona sin umbral', () => {
    const q = quoteDelivery(sinUmbral, 1000000);

    expect(q).toMatchObject({ feeCents: 5000, reason: 'zone' });
    expect(q.covered && q.missingForFreeCents).toBeNull();
  });

  it('una zona con tarifa cero cobra cero, y eso es una decisión', () => {
    const gratis = { ...centro, feeCents: 0, freeOverCents: null };
    const q = quoteDelivery(gratis, 100);

    expect(q).toMatchObject({ covered: true, feeCents: 0, reason: 'zone' });
  });
});

describe('gratis por monto', () => {
  it('regala el envío justo en el umbral', () => {
    const q = quoteDelivery(centro, 80000);

    expect(q).toMatchObject({ feeCents: 0, reason: 'free_over_threshold' });
    expect(q.covered && q.missingForFreeCents).toBeNull();
  });

  it('un centavo menos todavía se cobra', () => {
    expect(quoteDelivery(centro, 79999)).toMatchObject({
      feeCents: 5000,
      reason: 'zone',
    });
  });

  it('el umbral se mide contra la mercancía, no contra el total', () => {
    /*
     * Si se midiera contra el total, $780 de pescado más $50 de envío cruzarían
     * un umbral de $800 y el envío se volvería gratis — dejando el total en
     * $780, por debajo del umbral otra vez. La regla se muerde la cola.
     *
     * Aquí se pasa el subtotal y por eso no ocurre: el pedido paga su envío.
     */
    const subtotal = 78000;
    const q = quoteDelivery(centro, subtotal);

    expect(q).toMatchObject({ feeCents: 5000, reason: 'zone' });
    expect(subtotal + (q.covered ? q.feeCents : 0)).toBeGreaterThan(80000);
  });
});

describe('exención manual', () => {
  it('convierte una tarifa cobrada en perdonada, con motivo', () => {
    const q = quoteDelivery(centro, 62000);
    const applied = applyWaiver(q as never, 'Se retrasó el pedido anterior');

    expect(applied).toEqual({
      feeCents: 0,
      reason: 'waived',
      note: 'Se retrasó el pedido anterior',
    });
  });

  it('no convierte en exención algo que ya era gratis', () => {
    // Perdonar un envío gratis no es un error, pero llamarlo exención mentiría
    // sobre por qué costó cero.
    const q = quoteDelivery(centro, 90000);
    const applied = applyWaiver(q as never, 'da igual');

    expect(applied).toEqual({
      feeCents: 0,
      reason: 'free_over_threshold',
      note: null,
    });
  });

  it('tampoco sobre una zona de tarifa cero', () => {
    const gratis = { ...centro, feeCents: 0, freeOverCents: null };
    const q = quoteDelivery(gratis, 100);

    expect(applyWaiver(q as never, 'x')).toMatchObject({ reason: 'zone', note: null });
  });
});
