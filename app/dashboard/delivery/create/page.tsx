import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import ZoneForm from '@/modules/delivery/components/zone-form';

export const metadata = { title: 'Crear zona' };

export default async function Page() {
  /*
   * Los botones ya se ocultan con `<Can role="admin">`, pero eso es la UI.
   * Un `staff` que teclee esta URL veía el formulario entero y sólo se
   * enteraba al enviarlo, cuando la Server Action lo rechazaba. La página
   * dice que no desde el principio.
   */
  if (!(await pageRole('admin'))) return <Forbidden needs="admin" />;


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
