import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
import { Suspense } from 'react';

import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import ZoneTable from '@/modules/delivery/components/zone-table';
import { CreateZone } from '@/modules/delivery/components/zone-buttons';

export const metadata = { title: 'Zonas de reparto' };

export const dynamic = 'force-dynamic';

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
      <PageHeader
        title="Zonas de reparto"
        description="El código postal decide el costo del envío. Un código que no esté en ninguna zona activa queda fuera de cobertura, que no es lo mismo que envío gratis."
        actions={<CreateZone />}
      />

      <Suspense fallback={<TableSkeleton rows={3} />}>
        <ZoneTable />
      </Suspense>
    </div>
  );
}
