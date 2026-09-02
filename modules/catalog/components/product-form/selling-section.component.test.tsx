/**
 * @vitest-environment happy-dom
 *
 * El DOM se pide por archivo, no por patrón en la configuración: en Vitest 4
 * `environmentMatchGlobs` dejó de aplicarse **en silencio** y las pruebas
 * morían con «document is not defined».
 */
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SupplyType } from '@/db/schema/catalog';
import SellingSection from './selling-section';

/**
 * El ciclo de encargo aparece y desaparece con el tipo de abastecimiento.
 *
 * `DOCS/PLAN-PRUEBAS.md §4.2` lo pedía y no se podía escribir: vivía dentro de
 * un formulario de 688 líneas que había que montar entero —con su acción de
 * servidor y su estado— para llegar a tres campos. Extraer la sección es lo que
 * hizo posible esta prueba, y esa es media razón para haberlo hecho.
 *
 * Lo que se protege es una regla con consecuencia real: sin corte y sin día de
 * llegada, la tienda promete «llega el …» con un hueco. El validador ya lo
 * rechaza; esto comprueba que el operador **pueda escribirlos**, que es el paso
 * anterior y el que ninguna prueba de dominio ve.
 */

/** Envuelve la sección con el estado que en producción vive en el formulario. */
function Harness({ initial = 'fresh' }: { initial?: SupplyType }) {
  const [supply, setSupply] = useState<SupplyType>(initial);

  return (
    <SellingSection
      errors={{}}
      supply={supply}
      onSupplyChange={setSupply}
    />
  );
}

const cycleFields = () => [
  screen.queryByLabelText(/corte/i),
  screen.queryByLabelText(/hora/i),
  screen.queryByLabelText(/llega el/i),
];

describe('el ciclo de encargo', () => {
  it('no se pide para un producto fresco', () => {
    render(<Harness initial="fresh" />);

    // Pedirlo siempre llenaría el formulario de campos que no aplican al 90 %
    // del catálogo.
    for (const field of cycleFields()) expect(field).toBeNull();
  });

  it('aparece al elegir «por encargo»', async () => {
    render(<Harness initial="fresh" />);

    await userEvent.click(screen.getByRole('radio', { name: /encargo/i }));

    for (const field of cycleFields()) expect(field).not.toBeNull();
  });

  it('desaparece al volver a un tipo que no lo usa', async () => {
    render(<Harness initial="preorder" />);
    expect(cycleFields()[0]).not.toBeNull();

    await userEvent.click(screen.getByRole('radio', { name: /fresco/i }));

    // Importa que se vayan del DOM y no sólo que se oculten: un campo escondido
    // sigue enviándose, y guardaría un ciclo en un producto que no lo tiene.
    for (const field of cycleFields()) expect(field).toBeNull();
  });

  it('llega abierto cuando el producto ya era de encargo', () => {
    render(<Harness initial="preorder" />);

    for (const field of cycleFields()) expect(field).not.toBeNull();
  });
});

describe('el peso neto', () => {
  it('se pide siempre, porque el paquete lo necesita', () => {
    render(<Harness />);

    // Etiqueta exacta: la pista del radio «paquete» también dice «peso neto»,
    // y una expresión suelta encontraba dos elementos.
    expect(screen.getByLabelText('Peso neto en gramos')).not.toBeNull();
  });
});
