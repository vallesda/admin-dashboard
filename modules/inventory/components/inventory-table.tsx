import { AdjustmentsHorizontalIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

import { listInventory } from '../queries';
import StockBadge from './stock-badge';
import InitInventoryButton from './init-inventory-button';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';
import { ButtonLink } from '@/app/ui/button';

/**
 * Stock levels across the catalogue.
 *
 * Fetches its own page so it can stream behind a `<Suspense>` boundary, like
 * the product table.
 *
 * The three stock columns are ordered on hand → reservado → disponible because
 * that is the arithmetic: the last one is what the first two produce, and it is
 * the only one that decides whether the shop can sell. It gets the ink; the two
 * inputs stay muted.
 */
export default async function InventoryTable({
  query,
  currentPage,
  lowOnly,
}: {
  query: string;
  currentPage: number;
  lowOnly: boolean;
}) {
  const { items } = await listInventory(query, currentPage, lowOnly);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={ArchiveBoxIcon}
          title={
            lowOnly
              ? 'Todo por encima del umbral'
              : query
                ? 'Sin coincidencias'
                : 'Todavía no hay inventario'
          }
          description={
            lowOnly
              ? 'Ningún producto necesita resurtido ahora mismo.'
              : query
                ? `Ningún producto coincide con “${query}”.`
                : 'Cuando crees productos podrás inicializar su inventario aquí.'
          }
          action={
            lowOnly ? (
              <ButtonLink href="/dashboard/inventory" variant="secondary">
                Ver todo el inventario
              </ButtonLink>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((item) => (
          <RecordCard
            key={item.productId}
            title={item.name}
            subtitle={item.sku}
            badge={
              item.hasInventory ? (
                <StockBadge
                  available={item.available}
                  isLowStock={item.isLowStock}
                />
              ) : (
                <Badge tone="warn">Sin inventario</Badge>
              )
            }
            rows={[
              { label: 'En mano', value: item.onHand, numeric: true },
              { label: 'Reservado', value: item.reserved, numeric: true },
              { label: 'Umbral', value: item.lowStockThreshold, numeric: true },
            ]}
            actions={
              item.hasInventory ? (
                <ManageLink id={item.productId} name={item.name} />
              ) : (
                <InitInventoryButton
                  productId={item.productId}
                  name={item.name}
                />
              )
            }
          />
        ))}
      </div>

      {/* Desktop */}
      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Producto</TH>
            <TH>SKU</TH>
            <TH align="right">En mano</TH>
            <TH align="right">Reservado</TH>
            <TH align="right">Disponible</TH>
            <TH align="right">Umbral</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.productId}>
                <TD className="whitespace-nowrap font-medium">{item.name}</TD>
                <TD muted className="whitespace-nowrap font-mono text-xs">
                  {item.sku}
                </TD>
                <TD numeric muted className="whitespace-nowrap">
                  {item.onHand}
                </TD>
                <TD numeric muted className="whitespace-nowrap">
                  {item.reserved}
                </TD>
                <TD numeric className="whitespace-nowrap font-medium">
                  {item.hasInventory ? (
                    <StockBadge
                      available={item.available}
                      isLowStock={item.isLowStock}
                    />
                  ) : (
                    <Badge tone="warn">Sin inventario</Badge>
                  )}
                </TD>
                <TD numeric muted className="whitespace-nowrap">
                  {item.lowStockThreshold}
                </TD>
                <TD>
                  <div className="flex justify-end">
                    {item.hasInventory ? (
                      <ManageLink id={item.productId} name={item.name} />
                    ) : (
                      <InitInventoryButton
                        productId={item.productId}
                        name={item.name}
                      />
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableShell>
    </>
  );
}

function ManageLink({ id, name }: { id: string; name: string }) {
  return (
    <ButtonLink
      href={`/dashboard/inventory/${id}`}
      variant="secondary"
      size="sm"
    >
      <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
      Gestionar
      <span className="sr-only"> {name}</span>
    </ButtonLink>
  );
}
