import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
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
    <main>
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
      <ProductForm categories={categories} product={product} />
    </main>
  );
}
