'use client';

import { useActionState, useState } from 'react';

import { FormCard, FormError, FormActions } from '@/app/ui/kit/form';
import type { ProductRow, SupplyType } from '@/db/schema/catalog';
import { createProduct, updateProduct } from '../../actions';
import { emptyProductFormState, type ProductFormState } from '../../form-state';
import type { CategoryOption } from '../../queries';
import IdentitySection from './identity-section';
import PricingSection from './pricing-section';
import HomeFlagsSection from './home-flags-section';
import SellingSection from './selling-section';
import PresentationSection from './presentation-section';

/**
 * Alta y edición de un producto.
 *
 * Este archivo es deliberadamente corto: es el índice del formulario, no su
 * contenido. Cada sección vive en su propio archivo, con el nombre de lo que
 * pregunta, así que encontrar «dónde se edita el origen» es leer cinco nombres
 * en lugar de recorrer setecientas líneas.
 *
 * Aquí sólo queda lo que ninguna sección puede resolver sola:
 *
 * - **A qué acción se envía.** Crear y editar comparten formulario y difieren
 *   sólo en eso; el `bind` del id es lo que evita un campo oculto con el
 *   identificador dentro.
 * - **El tipo de abastecimiento.** Es el único estado compartido, porque
 *   destapa el ciclo de encargo dentro de «Cómo se vende». Vive arriba para que
 *   las demás secciones no tengan que saber que existe.
 *
 * Para añadir un campo a un producto hacen falta **cuatro** cambios, y este es
 * sólo uno: el esquema (`validators.ts`), el servicio (`service.ts`), la
 * lectura del formulario (`product-form-data.ts`) y la sección de aquí. Saltarse
 * la lectura no rompe nada visible — el campo se guarda vacío.
 */
type Props = {
  categories: CategoryOption[];
  /** Ausente al crear, presente al editar. */
  product?: ProductRow;
  selectedCategoryIds?: string[];
};

export default function ProductForm({
  categories,
  product,
  selectedCategoryIds = [],
}: Props) {
  const isEdit = product !== undefined;

  const [supply, setSupply] = useState<SupplyType>(
    product?.supplyType ?? 'fresh',
  );

  const action = isEdit ? updateProduct.bind(null, product.id) : createProduct;

  const [state, formAction, isPending] = useActionState<
    ProductFormState,
    FormData
  >(action, emptyProductFormState);

  const errors = state.errors;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormCard>
        <FormError message={state.message} />

        <IdentitySection
          product={product}
          errors={errors}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
        />

        <PricingSection product={product} errors={errors} />

        <HomeFlagsSection product={product} errors={errors} />

        <SellingSection
          product={product}
          errors={errors}
          supply={supply}
          onSupplyChange={setSupply}
        />

        <PresentationSection product={product} errors={errors} />
      </FormCard>

      <FormActions
        cancelHref="/dashboard/products"
        submitLabel={isEdit ? 'Guardar cambios' : 'Crear producto'}
        isPending={isPending}
      />
    </form>
  );
}
