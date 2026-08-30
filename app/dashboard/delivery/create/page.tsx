import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import ZoneForm from '@/modules/delivery/components/zone-form';

export const metadata = { title: 'Crear zona' };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Zonas de reparto', href: '/dashboard/delivery' },
          { label: 'Crear zona', href: '/dashboard/delivery/create', active: true },
        ]}
      />

      <PageHeader title="Crear zona" />
      <ZoneForm />
    </div>
  );
}
