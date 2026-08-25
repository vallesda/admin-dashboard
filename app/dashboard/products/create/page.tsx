import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import ProductForm from '@/modules/catalog/components/product-form';
import { listCategoryOptions } from '@/modules/catalog/queries';

export const metadata = { title: 'Crear producto' };

/**
 * Rendered per request: the category dropdown is read from the database, so a
 * prerendered page would keep offering yesterday's categories.
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  const categories = await listCategoryOptions();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Productos', href: '/dashboard/products' },
          {
            label: 'Crear producto',
            href: '/dashboard/products/create',
            active: true,
          },
        ]}
      />
      <ProductForm categories={categories} />
    </main>
  );
}
