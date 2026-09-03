/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import StoreMap from './store-map';

/**
 * Lo que protege este archivo es una promesa de rendimiento y privacidad, no un
 * pixel: **el iframe de Google no se carga hasta que alguien lo pide**.
 *
 * Es fácil de romper sin querer —basta con «simplificar» quitando el estado— y
 * el coste no se ve al mirar la página: sólo aparece como un megabyte más y
 * unas cookies de terceros en cada visita de alguien que venía a leer otra
 * cosa.
 */

const iframe = () => document.querySelector('iframe');

describe('la fachada', () => {
  it('no carga ningún iframe de entrada', () => {
    render(<StoreMap />);

    expect(iframe()).toBeNull();
  });

  it('enseña la dirección sin necesidad de mapa', () => {
    // Quien venía por la calle ya la tiene, sin pagar el mapa.
    render(<StoreMap />);

    expect(screen.getByText(/Río Amazonas 132 Ote/i)).not.toBeNull();
    expect(screen.getByText(/San Pedro Garza García/i)).not.toBeNull();
  });

  it('el enlace a Google no depende de JavaScript', () => {
    /*
     * Es un ancla de verdad: funciona sin hidratar, en un lector de pantalla y
     * en el teléfono de quien prefiere abrir su propia app de mapas. El botón
     * del mapa es el extra, no el camino.
     */
    render(<StoreMap />);

    const link = screen.getByRole('link', { name: /Cómo llegar/i });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/maps\.app\.goo\.gl\//);
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});

describe('cuando se pide el mapa', () => {
  it('carga el iframe apuntando a Google Maps', () => {
    render(<StoreMap />);
    fireEvent.click(screen.getByRole('button', { name: /Ver el mapa aquí/i }));

    const frame = iframe();
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute('src')).toContain('google.com/maps/embed');
  });

  it('el iframe lleva título, para que no sea «marco sin nombre»', () => {
    // Un iframe sin `title` es lo que un lector de pantalla anuncia como un
    // marco anónimo, y ahí se acaba la navegación.
    render(<StoreMap />);
    fireEvent.click(screen.getByRole('button', { name: /Ver el mapa aquí/i }));

    expect(iframe()!.getAttribute('title')).toMatch(/Mapa de Amor a Mar/i);
  });
});
