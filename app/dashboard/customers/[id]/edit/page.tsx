import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import CustomerForm from '@/modules/customers/components/customer-form';
import { getCustomerById } from '@/modules/customers/queries';

export const metadata = { title: 'Editar cliente' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const customer = await getCustomerById(id);

  if (!customer) notFound();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Clientes', href: '/dashboard/customers' },
          {
            label: 'Editar cliente',
            href: `/dashboard/customers/${id}/edit`,
            active: true,
          },
        ]}
      />
      <CustomerForm customer={customer} />
    </main>
  );
}
