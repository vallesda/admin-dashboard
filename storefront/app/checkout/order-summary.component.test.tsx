/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Cart } from '@/lib/cart';
import type { DeliveryQuote } from '@/lib/commerce/types';
import OrderSummary from './order-summary';

/**
 * El panel lateral: lo último que se lee antes de pagar.
 *
 * Lo que se protege es que el cliente sepa **cuánto va a pagar** antes de
 * pulsar. Un total que aparece sin el envío, o un «fuera de cobertura» que no
 * frena el botón, convierten el checkout en una sorpresa.
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
  pending: false,
  quoteLoading: false,
};

// Por rol y no por texto: al enviar, la etiqueta cambia a «Enviando…».
const boton = () => screen.getByRole('button') as HTMLButtonElement;

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
  it('no deja confirmar', () => {
    render(
      <OrderSummary
        {...base}
        fulfillment="delivery"
        quote={sinCobertura()}
      />,
    );

    // Dejarlo pulsar sería crear un pedido que nadie puede entregar.
    expect(boton().disabled).toBe(true);
  });

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

  it('recoger en tienda nunca se bloquea por cobertura', () => {
    // No hay envío que cubrir.
    render(<OrderSummary {...base} fulfillment="pickup" quote={null} />);

    expect(boton().disabled).toBe(false);
  });
});

describe('mientras se envía', () => {
  it('el botón se bloquea para no crear dos pedidos', () => {
    render(<OrderSummary {...base} pending fulfillment="pickup" quote={null} />);

    expect(boton().disabled).toBe(true);
  });
});
