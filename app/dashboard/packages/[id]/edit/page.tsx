import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import PackageForm from '@/modules/catalog/components/package-form';
import PackageItems from '@/modules/catalog/components/package-items';
import {
  getPackageById,
  listPackageItems,
  listPackageProductOptions,
} from '@/modules/catalog/queries';

export const metadata = { title: 'Editar paquete' };

/** Lines and product options both change under the admin; never prerender. */
export const dynamic = 'force-dynamic';

export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const pkg = await getPackageById(id);

  if (!pkg) notFound();

  const [items, options] = await Promise.all([
    listPackageItems(id),
    listPackageProductOptions(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Paquetes', href: '/dashboard/packages' },
          {
            label: pkg.name,
            href: `/dashboard/packages/${id}/edit`,
            active: true,
          },
        ]}
      />

      <PageHeader
        title={pkg.name}
        description="Los datos del paquete y las piezas que lleva se guardan por separado: las líneas se aplican al instante."
      />

      {/* Lines first. Someone opening an existing package is far more often
          adding a piece than renaming it. */}
      <PackageItems packageId={id} items={items} options={options} />

      <PackageForm pkg={pkg} />
    </div>
  );
}
