import { Suspense } from 'react';

import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import PackageTable from '@/modules/catalog/components/package-table';
import { CreatePackage } from '@/modules/catalog/components/package-buttons';

export const metadata = { title: 'Paquetes' };

/** Publishing state changes from this screen, so it is never prerendered. */
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Paquetes"
        description="Reúnen todo lo que una receta necesita. Aparecen en la portada junto a las categorías destacadas."
        actions={<CreatePackage />}
      />

      <Suspense fallback={<TableSkeleton rows={4} />}>
        <PackageTable />
      </Suspense>
    </div>
  );
}
