/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Cart } from '@/lib/cart';
import type { DeliveryQuote } from '@/lib/commerce/types';
import OrderSummary from './order-summary';

/**
 * El panel lateral: cuánto va a pagar.
 *
 * Lo que se protege es que el cliente lo sepa **antes** de pulsar. Un total que
 * aparece sin el envío convierte el checkout en una sorpresa.
 *
 * El botón ya no vive aquí: con el checkout por pasos, la acción cierra el paso
 * que se está mirando. Lo que se bloquea y por qué se prueba en
 * `checkout-form.component.test.tsx`; este archivo se quedó con las cifras.
 *
 * Ojo con lo que este panel *no* hace: no calcula. El total que enseña es
 * informativo y el que se cobra lo vuelve a calcular el panel desde los
 * identificadores del carrito. Por eso una cifra equivocada aquí es un problema
 * de confianza, no de dinero.
 */
const cart: Cart = {
  lines: [
    {
      productId: 'p1',
      handle: 'atun',
      name: 'Atún aleta amarilla',
      unitPrice: { amountCents: 48000, currency: 'MXN' },
      quantity: 2,
      image: null,
    },
  ],
} as Cart;

/**
 * `DeliveryQuote` es una unión discriminada, no un objeto con banderas: o hay
 * cobertura y entonces hay zona y tarifa, o no la hay y no hay nada más que
 * decir. Dos constructoras en vez de uno con `Partial` mantienen esa promesa.
 */
const cubierto = (over: Partial<Extract<DeliveryQuote, { covered: true }>> = {}): DeliveryQuote => ({
  covered: true,
  zoneId: 'z1',
  zoneName: 'San Pedro',
  feeCents: 9900,
  reason: 'zone',
  missingForFreeCents: null,
  ...over,
});

const sinCobertura = (): DeliveryQuote => ({ covered: false, reason: 'out_of_range' });

const base = {
  cart,
  subtotalCents: 96000,
  quoteLoading: false,
};

describe('lo que suma', () => {
  it('enseña el subtotal y las líneas del carrito', () => {
    render(<OrderSummary {...base} fulfillment="pickup" quote={null} />);

    expect(screen.getByText('Atún aleta amarilla')).not.toBeNull();
    expect(screen.getAllByText('$960.00').length).toBeGreaterThan(0);
  });

  it('a domicilio, el envío entra en el total', () => {
    render(<OrderSummary {...base} fulfillment="delivery" quote={cubierto()} />);

    // 960 + 99 = 1059. Si el envío no entrara, el cliente vería un total que
    // no es el que se le va a cobrar.
    expect(screen.getByText('$1,059.00')).not.toBeNull();
  });
});

describe('fuera de cobertura', () => {
  it('dice por qué, con palabras del negocio', () => {
    render(
      <OrderSummary
        {...base}
        fulfillment="delivery"
        quote={sinCobertura()}
      />,
    );

    // El texto es del componente, no de la cotización: la API manda el hecho
    // y la tienda decide cómo contarlo, incluida la salida —recoger en tienda.
    expect(screen.getByText(/no hacemos entregas en ese código postal/i)).not.toBeNull();
    expect(screen.getByText(/recoger tu\s+pedido en la tienda/i)).not.toBeNull();
  });
});

describe('qué se lleva', () => {
  it('dice cuántos productos son', () => {
    // En «Revisar» este panel es la única prueba de qué se está pagando, y
    // contar líneas a ojo no es prueba.
    render(<OrderSummary {...base} fulfillment="pickup" quote={null} />);

    expect(screen.getByText('1 producto')).not.toBeNull();
  });
});
