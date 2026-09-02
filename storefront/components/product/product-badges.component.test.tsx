/**
 * @vitest-environment happy-dom
 *
 * El DOM se pide por archivo, no por patrón en la configuración: en Vitest 4
 * `environmentMatchGlobs` dejó de aplicarse **en silencio**.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Product, ProductSupply } from '@/lib/commerce/types';
import ProductBadges from './product-badges';

/**
 * Cuál de las tres etiquetas gana cuando coinciden.
 *
 * Es una regla de negocio, no una preferencia visual: la etiqueta de la
 * izquierda es lo único que le dice a un cliente si puede comprar hoy o no. Un
 * producto agotado que muestra «De temporada» invita a intentarlo y a
 * frustrarse en el carrito.
 *
 * Se prueba aquí y no sobre la tarjeta entera porque la tarjeta necesita
 * imágenes, precio y enlace para montarse, y ninguna de las tres tiene nada que
 * ver con esta decisión.
 */
const supply = (over: Partial<ProductSupply> = {}): ProductSupply => ({
  type: 'fresh',
  label: 'Fresco',
  notice: null,
  shortNotice: null,
  arrivesOn: null,
  orderBy: null,
  ...over,
});

const product = (over: Partial<Product> = {}): Product =>
  ({
    availableForSale: true,
    seasonal: false,
    supply: supply(),
    ...over,
  }) as Product;

describe('cuál etiqueta gana', () => {
  it('agotado tapa a todo lo demás', () => {
    render(
      <ProductBadges
        product={product({
          availableForSale: false,
          seasonal: true,
          supply: supply({ type: 'preorder', shortNotice: 'Llega el jueves' }),
        })}
      />,
    );

    expect(screen.getByText('Agotado')).not.toBeNull();
    expect(screen.queryByText('De temporada')).toBeNull();
    expect(screen.queryByText('Llega el jueves')).toBeNull();
  });

  it('por encargo gana a de temporada', () => {
    // De temporada describe el producto; por encargo cambia lo que le pasa a
    // quien lo compra. Gana la que altera la decisión.
    render(
      <ProductBadges
        product={product({
          seasonal: true,
          supply: supply({ type: 'preorder', shortNotice: 'Llega el jueves' }),
        })}
      />,
    );

    expect(screen.getByText('Llega el jueves')).not.toBeNull();
    expect(screen.queryByText('De temporada')).toBeNull();
  });

  it('sin aviso propio, por encargo se dice con palabras genéricas', () => {
    render(
      <ProductBadges product={product({ supply: supply({ type: 'preorder' }) })} />,
    );

    expect(screen.getByText('Por encargo')).not.toBeNull();
  });

  it('de temporada aparece cuando no hay nada más urgente', () => {
    render(<ProductBadges product={product({ seasonal: true })} />);

    expect(screen.getByText('De temporada')).not.toBeNull();
  });

  it('un producto corriente no lleva etiqueta izquierda', () => {
    render(<ProductBadges product={product()} />);

    for (const texto of ['Agotado', 'Por encargo', 'De temporada']) {
      expect(screen.queryByText(texto)).toBeNull();
    }
  });
});

describe('lo que es la pieza', () => {
  it('se muestra también cuando está agotada', () => {
    // Seguirá siendo congelado mañana: no depende de la existencia de hoy.
    render(
      <ProductBadges
        product={product({
          availableForSale: false,
          supply: supply({ type: 'stocked', label: 'Congelado' }),
        })}
      />,
    );

    expect(screen.getByText('Agotado')).not.toBeNull();
    expect(screen.getByText('Congelado')).not.toBeNull();
  });

  it('la disponibilidad se dice con palabras, no sólo con color', () => {
    // Ni la desaturación de la foto ni un color sobreviven a una pantalla en
    // blanco y negro o al sol de mediodía.
    render(<ProductBadges product={product({ availableForSale: false })} />);

    expect(screen.getByText('Agotado').textContent).toBe('Agotado');
  });
});
