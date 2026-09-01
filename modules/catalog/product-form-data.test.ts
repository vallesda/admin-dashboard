import { describe, expect, it } from 'vitest';

import { readProductForm } from './product-form-data';
import { createProductSchema } from './validators';

/**
 * El puente entre el formulario y el esquema.
 *
 * Existe por un fallo concreto: se añadieron cuatro campos al esquema, al
 * servicio y al formulario, pero no a esta lectura. El formulario los enviaba,
 * la lectura no los recogía y `optionalText` convertía el `undefined` en
 * `null`, así que el panel decía «guardado» y el producto salía vacío. Ni un
 * error en pantalla ni una línea en el log.
 *
 * Ese es el modo de fallo que estas pruebas cierran: no comprueban que el
 * guardado funcione —de eso ya se encarga el esquema—, sino que **ningún campo
 * del formulario se pierda por el camino**.
 */
const complete = () => {
  const fd = new FormData();
  const values: Record<string, string> = {
    sku: 'ATU-001',
    name: 'Atún aleta amarilla',
    slug: 'atun-aleta-amarilla',
    shortDescription: 'Seleccionado pieza por pieza en el mostrador.',
    description: 'Llega entero del barco y se corta el mismo día.',
    origin: 'Ensenada, Baja California',
    presentation: 'Lomo en bloque, corte sashimi',
    storageInstructions: 'Refrigerado de 0 a 4 °C.',
    priceCents: '480',
    unitType: 'kg',
    supplyType: 'fresh',
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};

/** Lo que el cliente lee en la ficha. Ninguno puede perderse en el trayecto. */
const SHOPPER_FACING = [
  'shortDescription',
  'description',
  'origin',
  'presentation',
  'storageInstructions',
] as const;

describe('readProductForm', () => {
  it('recoge todos los campos que el cliente ve en la ficha', () => {
    const input = readProductForm(complete()) as Record<string, unknown>;

    for (const field of SHOPPER_FACING) {
      expect(input[field], `${field} se perdió al leer el formulario`).toBeTruthy();
    }
  });

  it('los entrega intactos hasta el otro lado del esquema', () => {
    const parsed = createProductSchema.safeParse(readProductForm(complete()));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const data = parsed.data as Record<string, unknown>;
    expect(data.origin).toBe('Ensenada, Baja California');
    expect(data.presentation).toBe('Lomo en bloque, corte sashimi');
    expect(data.shortDescription).toBe(
      'Seleccionado pieza por pieza en el mostrador.',
    );
    expect(data.storageInstructions).toBe('Refrigerado de 0 a 4 °C.');
  });

  it('un campo en blanco llega como null, no como cadena vacía', () => {
    // La ficha oculta la fila cuando el valor es null. Con `''` dibujaría una
    // etiqueta «Origen» seguida de nada.
    const fd = complete();
    fd.set('origin', '   ');
    fd.set('presentation', '');

    const parsed = createProductSchema.safeParse(readProductForm(fd));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect((parsed.data as Record<string, unknown>).origin).toBeNull();
    expect((parsed.data as Record<string, unknown>).presentation).toBeNull();
  });
});
