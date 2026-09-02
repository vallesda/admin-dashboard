/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { Collection } from '@/lib/commerce/types';
import { CollectionNavList } from './collection-nav';

/**
 * El rail de categorías.
 *
 * Lo que se protege es cuál pastilla queda marcada. Es la única señal de «dónde
 * estoy» que tiene el cliente al navegar el catálogo, y el proyecto tiene una
 * regla explícita: la activa se marca con superficie llena **y** `aria-current`,
 * nunca sólo con color — un lector de pantalla no ve el relleno.
 */
const collections: Collection[] = [
  { handle: 'producto-fresco', title: 'Fresco', showInNav: true },
  { handle: 'producto-congelado', title: 'Congelado', showInNav: true },
  { handle: 'filetes', title: 'Filetes', showInNav: true },
];

const activo = () =>
  screen.getAllByRole('link').find((l) => l.getAttribute('aria-current') === 'page');

describe('cuál categoría se marca como activa', () => {
  it('marca la abierta, y sólo esa', () => {
    render(<CollectionNavList collections={collections} active="filetes" />);

    expect(activo()?.textContent).toContain('Filetes');
    expect(
      screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current')),
    ).toHaveLength(1);
  });

  it('sin categoría abierta, la activa es «Todo el catálogo»', () => {
    render(<CollectionNavList collections={collections} />);

    expect(activo()?.textContent).toContain('Todo el catálogo');
  });

  it('un handle que no existe no marca nada', () => {
    // Puede pasar: un enlace viejo, o una categoría archivada desde el panel.
    // Preferible ninguna marcada a marcar la equivocada.
    render(<CollectionNavList collections={collections} active="pescado" />);

    expect(activo()).toBeUndefined();
  });

  it('lo dice con `aria-current`, no sólo con el relleno', () => {
    render(<CollectionNavList collections={collections} active="filetes" />);

    // Sin esto, quien navega con lector de pantalla recorre cuatro enlaces
    // idénticos sin saber en cuál está.
    expect(activo()?.getAttribute('aria-current')).toBe('page');
  });
});

describe('qué entra en el rail', () => {
  it('una pastilla por categoría, más la de todo el catálogo', () => {
    render(<CollectionNavList collections={collections} />);

    expect(screen.getAllByRole('link')).toHaveLength(collections.length + 1);
  });

  it('cada una apunta a su propia URL', () => {
    render(<CollectionNavList collections={collections} />);

    expect(
      screen.getByRole('link', { name: /Congelado/ }).getAttribute('href'),
    ).toBe('/search/producto-congelado');
  });

  it('sin categorías queda sólo la salida al catálogo completo', () => {
    // Es lo que se ve cuando el panel no responde: el menú degrada a vacío en
    // vez de tumbar la página.
    render(<CollectionNavList collections={[]} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Todo el catálogo');
  });
});
