import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import { pageRole } from '@/lib/auth/guard';
import Forbidden from '@/app/ui/kit/forbidden';
import UserForm from '@/modules/identity/components/user-form';

export const metadata = { title: 'Crear cuenta' };

export default async function Page() {
  const session = await pageRole('owner');

  if (!session) return <Forbidden needs="owner" />;

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Usuarios', href: '/dashboard/users' },
          {
            label: 'Crear cuenta',
            href: '/dashboard/users/create',
            active: true,
          },
        ]}
      />

      <PageHeader title="Crear cuenta" />
      <UserForm actorId={session.user.id} />
    </div>
  );
}
