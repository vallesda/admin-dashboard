/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { renderWithProviders as render, screen } from '@/test/render';

import type { Product } from '@/lib/commerce/types';
import ProductGrid from './product-grid';

/**
 * La rejilla del catálogo.
 *
 * Lo que importa aquí es el estado vacío. Una categoría sin productos se ve
 * igual que una categoría que falló al cargar si la rejilla no dice nada, y esa
 * confusión ya costó una tarde de diagnóstico en producción.
 */
const product = (id: string, name: string): Product =>
  ({
    id,
    handle: id,
    name,
    availableForSale: true,
    seasonal: false,
    price: { amountCents: 48000, currency: 'MXN' },
    unit: 'kg',
    featuredImage: null,
    images: [],
    variants: [],
    collections: [],
    preparationSuggestions: [],
    seo: { title: name, description: null },
  }) as unknown as Product;

describe('la rejilla', () => {
  it('dibuja una tarjeta por producto', () => {
    render(
      <ProductGrid
        products={[product('atun', 'Atún'), product('salmon', 'Salmón')]}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Atún')).not.toBeNull();
  });

  it('sin productos lo dice con palabras, no con un hueco', () => {
    render(<ProductGrid products={[]} />);

    expect(screen.getByText(/no hay productos/i)).not.toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('el estado vacío no finge ser una lista', () => {
    // Una `<ul>` vacía deja al lector de pantalla anunciando «lista, 0
    // elementos» y a nadie más viendo nada.
    render(<ProductGrid products={[]} />);

    expect(screen.queryByRole('list')).toBeNull();
  });
});
