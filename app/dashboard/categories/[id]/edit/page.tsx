import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import CategoryForm from '@/modules/catalog/components/category-form';
import { getCategoryById } from '@/modules/catalog/queries';

export const metadata = { title: 'Editar categoría' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const category = await getCategoryById(id);

  if (!category) notFound();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Categorías', href: '/dashboard/categories' },
          {
            label: 'Editar categoría',
            href: `/dashboard/categories/${id}/edit`,
            active: true,
          },
        ]}
      />
      <CategoryForm category={category} />
    </main>
  );
}
