/**
 * Configuración común de las pruebas.
 *
 * Deliberadamente mínima: lo único global es limpiar el DOM entre pruebas de
 * componente, que si no arrastran nodos de la anterior y hacen que un
 * `getByText` encuentre dos.
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
