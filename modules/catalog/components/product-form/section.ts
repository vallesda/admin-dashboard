import type { ProductRow } from '@/db/schema/catalog';
import type { ProductFormState } from '../../form-state';

/**
 * Lo que toda sección del formulario de producto recibe.
 *
 * Un único contrato para las cinco, en lugar de que cada una invente el suyo:
 * quien abra cualquier archivo de esta carpeta ya sabe qué props hay antes de
 * leer la firma, y añadir una sección nueva no obliga a decidir nada.
 *
 * `product` ausente significa «alta», presente significa «edición». Cada
 * sección deriva de ahí lo que necesite en vez de recibir además una bandera
 * `isEdit`: dos props que dicen lo mismo acaban discrepando.
 */
export type SectionProps = {
  /** El producto que se edita. `undefined` cuando se está creando uno nuevo. */
  product?: ProductRow;
  /** Errores del último envío, por nombre de campo. */
  errors: ProductFormState['errors'];
};
