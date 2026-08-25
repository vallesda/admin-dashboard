import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import OrderForm from '@/modules/sales/components/order-form';
import { listRecentCustomers } from '@/modules/customers/queries';
import { listSellableWithStock } from '@/modules/inventory/queries';

export const metadata = { title: 'Registrar pedido' };

/** Prices and availability change constantly; never prerender this. */
export const dynamic = 'force-dynamic';

export default async function Page() {
  const [customers, products] = await Promise.all([
    listRecentCustomers(),
    listSellableWithStock(),
  ]);

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Pedidos', href: '/dashboard/orders' },
          {
            label: 'Registrar pedido',
            href: '/dashboard/orders/create',
            active: true,
          },
        ]}
      />
      <OrderForm customers={customers} products={products} />
    </main>
  );
}
