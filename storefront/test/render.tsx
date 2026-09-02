import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';

import { CartProvider } from '@/components/cart/cart-context';

/**
 * `render` con los proveedores que la tienda da por hechos.
 *
 * Cualquier cosa que dibuje un producto acaba montando `ProductCartControl`,
 * que exige `CartProvider` y lanza sin él. Sin este ayudante, cada prueba de
 * catálogo tendría que descubrirlo por su cuenta y envolver a mano — que es
 * como se llega a cinco envoltorios distintos para el mismo problema.
 *
 * Es la única pieza compartida de las pruebas de la tienda. Si algún día hace
 * falta un segundo proveedor, se añade aquí y ninguna prueba se entera.
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: CartProvider, ...options });
}

export { screen, within, fireEvent } from '@testing-library/react';
