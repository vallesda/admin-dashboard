import { describe, expect, it } from 'vitest';

import { supplyOf, DEFAULT_SUPPLY, type Product } from './types';

/**
 * Primera prueba de la tienda. Comprueba que la tubería está montada y, de
 * paso, la degradación que evitó un 500 en toda la tienda.
 */
describe('supplyOf', () => {
  it('usa el valor por omisión cuando la API no manda `supply`', () => {
    // Pasó de verdad: una respuesta en caché sin este campo tumbó la tienda
    // entera porque una etiqueta decorativa leía `product.supply.type`.
    expect(supplyOf({} as Product)).toEqual(DEFAULT_SUPPLY);
  });

  it('respeta el que sí llega', () => {
    const supply = { ...DEFAULT_SUPPLY, type: 'stocked' as const, label: 'Congelado' };

    expect(supplyOf({ supply } as Product).label).toBe('Congelado');
  });
});
