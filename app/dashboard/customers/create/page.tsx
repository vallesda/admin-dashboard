import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import CustomerForm from '@/modules/customers/components/customer-form';

export const metadata = { title: 'Crear cliente' };

export default function Page() {
  return (
    <main>
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
      <CustomerForm />
    </main>
  );
}
