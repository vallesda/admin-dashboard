import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import CustomerForm from '@/modules/customers/components/customer-form';
import { getCustomerById } from '@/modules/customers/queries';

export const metadata = { title: 'Editar cliente' };

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const customer = await getCustomerById(id);

  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-5">
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

      <PageHeader
        title="Editar cliente"
      />
      <CustomerForm customer={customer} />
    </div>
  );
}
