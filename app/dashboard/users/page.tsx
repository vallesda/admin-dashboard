import { Suspense } from 'react';

import { TableSkeleton } from '@/app/ui/skeletons';
import PageHeader from '@/app/ui/kit/page-header';
import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
import UserTable from '@/modules/identity/components/user-table';
import { CreateUser } from '@/modules/identity/components/user-buttons';

export const metadata = { title: 'Usuarios' };

export const dynamic = 'force-dynamic';

/**
 * Who can get into the panel, and as what.
 *
 * Guarded here as well as in every action. The nav entry is hidden from
 * non-owners, but a hidden link is not a lock: this route has to refuse a
 * `staff` who types the URL, and `requireRole` throws before any query runs.
 */
export default async function Page() {
  const session = await pageRole('owner');

  if (!session) return <Forbidden needs="owner" />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios"
        description="Cada persona entra con su propia cuenta, y su rol decide qué puede hacer. Las cuentas no se borran: se desactivan, para que el historial siga teniendo autor."
        actions={<CreateUser />}
      />

      <Suspense fallback={<TableSkeleton rows={3} />}>
        <UserTable actorId={session.user.id} />
      </Suspense>
    </div>
  );
}
