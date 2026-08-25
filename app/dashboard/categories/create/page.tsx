import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import CategoryForm from '@/modules/catalog/components/category-form';

export const metadata = { title: 'Crear categoría' };

export default function Page() {
  return (
    <main>
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
      <CategoryForm />
    </main>
  );
}
