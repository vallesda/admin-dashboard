import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
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
    <div className="flex flex-col gap-5">
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

      <PageHeader
        title="Crear producto"
        description="Se crea como borrador: no aparece en la tienda hasta que lo actives desde la lista."
      />
      <ProductForm categories={categories} />
    </div>
  );
}
