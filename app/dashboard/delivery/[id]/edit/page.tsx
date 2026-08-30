import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import ZoneForm from '@/modules/delivery/components/zone-form';
import { getZoneById } from '@/modules/delivery/queries';

export const metadata = { title: 'Editar zona' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const zone = await getZoneById(id);

  if (!zone) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Zonas de reparto', href: '/dashboard/delivery' },
          {
            label: zone.name,
            href: `/dashboard/delivery/${id}/edit`,
            active: true,
          },
        ]}
      />

      <PageHeader title="Editar zona" />
      <ZoneForm zone={zone} />
    </div>
  );
}
