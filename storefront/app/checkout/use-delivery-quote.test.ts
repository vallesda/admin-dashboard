/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * La cotización de envío mientras el cliente escribe.
 *
 * Dos comportamientos que no se ven mirando la pantalla y que se rompen solos
 * en cuanto alguien toca este archivo:
 *
 * 1. **No preguntar de más.** Cinco dígitos o nada; una petición por tecla es
 *    una petición por tecla.
 * 2. **No enseñar una respuesta que ya no corresponde.** Al escribir se
 *    disparan varias peticiones y no llegan en orden. La de «0650» no puede
 *    quedarse en pantalla cuando el campo ya dice «06500».
 */
const quoteDeliveryAction = vi.fn();

vi.mock('./actions', () => ({
  quoteDeliveryAction: (...args: unknown[]) => quoteDeliveryAction(...args),
}));

const { useDeliveryQuote } = await import('./use-delivery-quote');

const QUOTE = { covered: true, feeCents: 9900, freeOverCents: null, message: null };

beforeEach(() => {
  vi.clearAllMocks();
  quoteDeliveryAction.mockResolvedValue(QUOTE);
});

afterEach(() => vi.restoreAllMocks());

const render = (props: { enabled?: boolean; postalCode: string; subtotalCents?: number }) =>
  renderHook(
    (p: { enabled: boolean; postalCode: string; subtotalCents: number }) =>
      useDeliveryQuote(p),
    {
      initialProps: {
        enabled: props.enabled ?? true,
        postalCode: props.postalCode,
        subtotalCents: props.subtotalCents ?? 48000,
      },
    },
  );

describe('cuándo pregunta', () => {
  it('no pregunta con un código incompleto', () => {
    render({ postalCode: '664' });

    expect(quoteDeliveryAction).not.toHaveBeenCalled();
  });

  it('no pregunta si el pedido se recoge en tienda', () => {
    // Recoger no tiene envío que cotizar.
    render({ enabled: false, postalCode: '66220' });

    expect(quoteDeliveryAction).not.toHaveBeenCalled();
  });

  it('pregunta al quinto dígito', async () => {
    render({ postalCode: '66220' });

    await waitFor(() =>
      expect(quoteDeliveryAction).toHaveBeenCalledWith('66220', 48000),
    );
  });
});

describe('qué enseña', () => {
  it('mientras espera, avisa de que está cargando y no muestra nada viejo', async () => {
    const { result } = render({ postalCode: '66220' });

    expect(result.current.loading).toBe(true);
    expect(result.current.quote).toBeNull();

    await waitFor(() => expect(result.current.quote).toEqual(QUOTE));
    expect(result.current.loading).toBe(false);
  });

  it('LA REGLA: una cotización deja de valer en cuanto cambia el código', async () => {
    const { result, rerender } = render({ postalCode: '66220' });
    await waitFor(() => expect(result.current.quote).toEqual(QUOTE));

    // Un dígito más y lo que hay en pantalla ya no corresponde a lo escrito.
    rerender({ enabled: true, postalCode: '66221', subtotalCents: 48000 });

    expect(result.current.quote).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('borrar el código apaga la cotización, no la congela', async () => {
    const { result, rerender } = render({ postalCode: '66220' });
    await waitFor(() => expect(result.current.quote).toEqual(QUOTE));

    rerender({ enabled: true, postalCode: '662', subtotalCents: 48000 });

    expect(result.current.quote).toBeNull();
    // Y tampoco dice que esté cargando: no hay nada que esperar.
    expect(result.current.loading).toBe(false);
  });

  it('cambiar a recoger en tienda retira la cotización', async () => {
    const { result, rerender } = render({ postalCode: '66220' });
    await waitFor(() => expect(result.current.quote).toEqual(QUOTE));

    rerender({ enabled: false, postalCode: '66220', subtotalCents: 48000 });

    expect(result.current.quote).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('vuelve a preguntar cuando cambia el subtotal', async () => {
    // El envío gratis depende del importe: agregar algo al carrito puede
    // cruzar el umbral.
    const { rerender } = render({ postalCode: '66220', subtotalCents: 48000 });
    await waitFor(() => expect(quoteDeliveryAction).toHaveBeenCalledTimes(1));

    rerender({ enabled: true, postalCode: '66220', subtotalCents: 96000 });

    await waitFor(() =>
      expect(quoteDeliveryAction).toHaveBeenCalledWith('66220', 96000),
    );
  });
});
