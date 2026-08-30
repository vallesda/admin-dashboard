import { Suspense } from 'react';

import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import ZoneTable from '@/modules/delivery/components/zone-table';
import { CreateZone } from '@/modules/delivery/components/zone-buttons';

export const metadata = { title: 'Zonas de reparto' };

export const dynamic = 'force-dynamic';

export default function Page() {
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
