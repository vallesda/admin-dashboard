import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/app/ui/shared/breadcrumbs';
import PageHeader from '@/app/ui/kit/page-header';
import Panel from '@/app/ui/kit/panel';
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
    <div className="flex flex-col gap-5">
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

      <PageHeader
        title={item.name}
        description={
          <>
            SKU <span className="font-mono text-ink">{item.sku}</span>
          </>
        }
      />

      {/*
        The three figures are one strip rather than three cards, because they
        are one equation and the operator reads them as such. The minus and
        equals signs are rendered between them — previously the relationship was
        explained in a sentence underneath ("disponible = en mano − reservado"),
        which asked the reader to hold three numbers in their head and apply it.
      */}
      <div className="flex flex-wrap items-stretch gap-2">
        <Figure label="En mano" value={item.onHand} />
        <Operator symbol="−" />
        <Figure label="Reservado" value={item.reserved} muted />
        <Operator symbol="=" />
        <Figure label="Disponible" value={item.available} emphasis />
      </div>

      {item.hasInventory ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <ReceiveStockForm productId={productId} />
          <AdjustStockForm productId={productId} />
          <ThresholdForm
            productId={productId}
            current={item.lowStockThreshold}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-warn/40 bg-warn-soft p-4 md:p-5">
          <h2 className="text-sm font-semibold text-warn">
            Este producto todavía no tiene inventario
          </h2>
          <p className="mb-4 mt-1 max-w-[70ch] text-sm text-warn">
            No se le puede recibir mercancía ni venderlo hasta crear su registro
            de existencias. Se creará en cero.
          </p>
          <InitInventoryButton productId={productId} name={item.name} />
        </div>
      )}

      <Panel
        title="Historial de movimientos"
        description="El registro no se edita ni se borra. Para corregir un error, registra un ajuste que lo compense."
        bodyClassName="p-0"
      >
        <Suspense
          fallback={
            <p className="p-4 text-sm text-ink-muted">Cargando historial…</p>
          }
        >
          <div className="p-4">
            <MovementHistory productId={productId} />
          </div>
        </Suspense>
      </Panel>
    </div>
  );
}

function Figure({
  label,
  value,
  muted = false,
  emphasis = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`min-w-32 flex-1 rounded-lg border bg-surface p-3.5 ${
        emphasis ? 'border-line-strong' : 'border-line'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums ${
          muted ? 'text-ink-muted' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** Decorative: the equation is restated for screen readers by the labels. */
function Operator({ symbol }: { symbol: string }) {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center px-1 text-lg text-ink-subtle sm:flex"
    >
      {symbol}
    </div>
  );
}
