import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
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
  /*
   * Los botones ya se ocultan con `<Can role="admin">`, pero eso es la UI.
   * Un `staff` que teclee esta URL veía el formulario entero y sólo se
   * enteraba al enviarlo, cuando la Server Action lo rechazaba. La página
   * dice que no desde el principio.
   */
  if (!(await pageRole('admin'))) return <Forbidden needs="admin" />;

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
