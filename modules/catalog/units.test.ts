import { describe, expect, it } from 'vitest';

import { unitTypeEnum, type UnitType } from '@/db/schema/catalog';
import { UNIT_LABEL, describeUnit } from './units';

/**
 * La traducción de unidades.
 *
 * Se prueba porque ya falló una vez y en silencio: cuando el enum creció de dos
 * valores a cuatro, la tabla de productos siguió compilando y empezó a decir
 * «Por pieza» de trece productos que se venden por kilo y por docena. Nada se
 * rompió; sólo se puso a mentir.
 *
 * La primera prueba es la que importa: recorre el enum real de la base, así que
 * el día que entre `litro` falla aquí en vez de aparecer como texto crudo en la
 * interfaz.
 */
describe('CAT — cada unidad de venta tiene nombre', () => {
  it('ninguna unidad del enum se queda sin traducir', () => {
    for (const unit of unitTypeEnum.enumValues) {
      expect(UNIT_LABEL[unit], `falta la etiqueta de ${unit}`).toBeTruthy();
    }
  });

  it('el paquete lleva su peso, que es lo que lo distingue', () => {
    expect(describeUnit({ unitType: 'pack', netWeightGrams: 500 })).toBe(
      'Paquete · 500 g',
    );
  });

  it('un paquete sin peso no inventa uno', () => {
    expect(describeUnit({ unitType: 'pack', netWeightGrams: null })).toBe(
      'Paquete',
    );
  });

  it('kilo y docena no caen en «Por pieza»', () => {
    // El fallo exacto que esto existe para impedir.
    expect(describeUnit({ unitType: 'kg', netWeightGrams: 1000 })).toBe(
      'Por kilo',
    );
    expect(describeUnit({ unitType: 'dozen', netWeightGrams: null })).toBe(
      'Por docena',
    );
  });

  it('el peso neto no se cuela donde no describe nada', () => {
    // Un producto por kilo puede llevar peso neto —el catálogo real lo lleva—
    // y aun así la unidad es el kilo, no el envase.
    const porKilo: { unitType: UnitType; netWeightGrams: number | null } = {
      unitType: 'kg',
      netWeightGrams: 1000,
    };
    expect(describeUnit(porKilo)).not.toContain('1000');
  });
});
