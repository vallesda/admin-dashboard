import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import ProductForm from '@/modules/catalog/components/product-form';
import { getProductById, listCategoryOptions } from '@/modules/catalog/queries';

export const metadata = { title: 'Editar producto' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const [product, categories] = await Promise.all([
    getProductById(id),
    listCategoryOptions(),
  ]);

  if (!product) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Productos', href: '/dashboard/products' },
          {
            label: 'Editar producto',
            href: `/dashboard/products/${id}/edit`,
            active: true,
          },
        ]}
      />

      <PageHeader
        title="Editar producto"
        description="El estado no se cambia aquí — usa los botones de la lista para activar o archivar."
      />
      <ProductForm categories={categories} product={product} />
    </div>
  );
}
