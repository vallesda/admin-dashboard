import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import CustomerForm from '@/modules/customers/components/customer-form';

export const metadata = { title: 'Crear cliente' };

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Clientes', href: '/dashboard/customers' },
          {
            label: 'Crear cliente',
            href: '/dashboard/customers/create',
            active: true,
          },
        ]}
      />

      <PageHeader
        title="Crear cliente"
        description="El teléfono es obligatorio: es como la pescadería confirma cada pedido."
      />
      <CustomerForm />
    </div>
  );
}
