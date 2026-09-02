import { describe, expect, it } from 'vitest';

import { slugify, normalizeForSearch } from './slug';

/**
 * El puente entre el nombre que el panel guarda y la URL que la tienda enlaza.
 *
 * Importa más de lo que parece: la ficha de producto construye el enlace a su
 * categoría derivándolo del nombre, y si el resultado no coincide con el handle
 * que el panel guardó, ese enlace es un 404. Un acento mal tratado convierte
 * «Atún» en una categoría que no existe.
 */
describe('slugify', () => {
  it('quita acentos, que es lo que hace que el enlace exista', () => {
    expect(slugify('Atún Aleta Azul')).toBe('atun-aleta-azul');
  });

  it('junta las palabras con guiones', () => {
    expect(slugify('Producto Fresco')).toBe('producto-fresco');
  });

  it('trata la ñ como el panel la trató', () => {
    expect(slugify('Pescado Español')).toBe('pescado-espanol');
  });

  it('no deja guiones sueltos en los extremos', () => {
    // «¡Ofertas!» daría `-ofertas-`, que es otra URL distinta de `ofertas`.
    expect(slugify('¡Ofertas!')).toBe('ofertas');
  });

  it('colapsa la puntuación y los espacios de en medio', () => {
    expect(slugify('Pescados  y / Mariscos')).toBe('pescados-y-mariscos');
  });

  it('sobrevive a un nombre que no deja nada utilizable', () => {
    // Preferible una cadena vacía —que da un 404 honesto— a `undefined`
    // recorriendo la plantilla hasta salir impreso en un `href`.
    expect(slugify('¿?¡!')).toBe('');
  });
});

describe('normalizeForSearch', () => {
  it('conserva los espacios, porque aquí se busca dentro del texto', () => {
    // Los iconos buscan «congel» dentro de «Producto Congelado»; unos guiones
    // en medio sólo estorbarían.
    expect(normalizeForSearch('Producto Congelado')).toBe('producto congelado');
  });

  it('quita los acentos igual que su hermana', () => {
    expect(normalizeForSearch('Camarón')).toBe('camaron');
  });
});
