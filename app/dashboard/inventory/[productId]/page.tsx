import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/invoices/breadcrumbs';
import { getInventoryWithProduct } from '@/modules/inventory/queries';
import MovementHistory from '@/modules/inventory/components/movement-history';
import {
  ReceiveStockForm,
  AdjustStockForm,
  ThresholdForm,
} from '@/modules/inventory/components/stock-forms';
import InitInventoryButton from '@/modules/inventory/components/init-inventory-button';

export const metadata = { title: 'Gestionar inventario' };

export const dynamic = 'force-dynamic';

export default async function Page(props: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await props.params;
  const item = await getInventoryWithProduct(productId);

  if (!item) notFound();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Inventario', href: '/dashboard/inventory' },
          {
            label: item.name,
            href: `/dashboard/inventory/${productId}`,
            active: true,
          },
        ]}
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Figure label="En mano" value={item.onHand} />
        <Figure label="Reservado" value={item.reserved} muted />
        <Figure label="Disponible" value={item.available} />
      </section>

      <p className="mb-6 text-sm text-gray-500">
        SKU <span className="font-mono">{item.sku}</span> · disponible = en mano
        − reservado
      </p>

      {item.hasInventory ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <ReceiveStockForm productId={productId} />
          <AdjustStockForm productId={productId} />
          <ThresholdForm
            productId={productId}
            current={item.lowStockThreshold}
          />
        </div>
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 md:p-6">
          <h2 className="text-sm font-medium text-amber-900">
            Este producto todavía no tiene inventario
          </h2>
          <p className="mb-4 mt-1 text-sm text-amber-900">
            No se le puede recibir mercancía ni venderlo hasta crear su registro
            de existencias. Se creará en cero.
          </p>
          <InitInventoryButton productId={productId} name={item.name} />
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Historial de movimientos</h2>
        <p className="mt-1 text-sm text-gray-500">
          El registro no se edita ni se borra. Para corregir un error, registra
          un ajuste que lo compense.
        </p>
        <Suspense
          fallback={
            <p className="mt-4 text-sm text-gray-500">Cargando historial…</p>
          }
        >
          <MovementHistory productId={productId} />
        </Suspense>
      </section>
    </main>
  );
}

function Figure({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-medium tabular-nums ${muted ? 'text-gray-500' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
