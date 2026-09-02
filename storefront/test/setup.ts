/**
 * Configuración común de las pruebas de la tienda.
 *
 * Deliberadamente mínima, igual que la del panel: lo único global es limpiar el
 * DOM entre pruebas, porque si no una prueba arrastra los nodos de la anterior
 * y un `getByText` acaba encontrando dos.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
