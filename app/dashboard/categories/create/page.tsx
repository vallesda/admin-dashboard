import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import CategoryForm from '@/modules/catalog/components/category-form';

export const metadata = { title: 'Crear categoría' };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Categorías', href: '/dashboard/categories' },
          {
            label: 'Crear categoría',
            href: '/dashboard/categories/create',
            active: true,
          },
        ]}
      />

      <PageHeader
        title="Crear categoría"
      />
      <CategoryForm />
    </div>
  );
}
