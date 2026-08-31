import type { UnitType } from '@/db/schema/catalog';

/**
 * Cómo se dice cada unidad de venta.
 *
 * ## Por qué es un módulo y no un ternario
 *
 * Vivía como `unitType === 'pack' ? 'Paquete · Xg' : 'Por pieza'`, repetido en
 * dos sitios de la tabla de productos. Mientras el enum tuvo dos valores fue
 * correcto; en cuanto entraron `kg` y `dozen` para el catálogo real, ese `else`
 * empezó a decir «Por pieza» de trece productos que se venden por kilo, por
 * docena o en paquete de 500 g. La lista mentía y nadie la había tocado.
 *
 * Un `Record` sobre `UnitType` no puede hacer eso: añadir un valor al enum es
 * un error de compilación aquí hasta que alguien decida cómo se llama. Ése es
 * todo el motivo de que exista este archivo.
 */
export const UNIT_LABEL: Record<UnitType, string> = {
  piece: 'Por pieza',
  pack: 'Paquete de peso cerrado',
  kg: 'Por kilo',
  dozen: 'Por docena',
};

/**
 * La misma unidad, en la línea de una fila de tabla.
 *
 * Más corta que la etiqueta del formulario —ahí hay sitio y hace falta
 * precisión; aquí va bajo el nombre del producto en 12px— y con el peso
 * incorporado cuando lo hay, porque «Paquete» a secas no distingue uno de 500 g
 * de uno de 2 kg y eso es justo lo que separa dos productos del catálogo.
 */
export function describeUnit(product: {
  unitType: UnitType;
  netWeightGrams: number | null;
}): string {
  if (product.unitType === 'pack') {
    return product.netWeightGrams
      ? `Paquete · ${product.netWeightGrams} g`
      : 'Paquete';
  }

  return UNIT_LABEL[product.unitType];
}
