import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
import UserForm from '@/modules/identity/components/user-form';
import ResetPassword from '@/modules/identity/components/reset-password';
import { getAdminUserById } from '@/modules/identity/queries';

export const metadata = { title: 'Editar cuenta' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await pageRole('owner');

  if (!session) return <Forbidden needs="owner" />;

  const { id } = await props.params;
  const user = await getAdminUserById(id);

  if (!user) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Usuarios', href: '/dashboard/users' },
          {
            label: user.name,
            href: `/dashboard/users/${id}/edit`,
            active: true,
          },
        ]}
      />

      <PageHeader title="Editar cuenta" />
      <UserForm user={user} actorId={session.user.id} />
      <ResetPassword id={user.id} name={user.name} />
    </div>
  );
}
