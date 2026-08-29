import Image from 'next/image';
import { CubeIcon } from '@heroicons/react/24/outline';

import { formatCentavos } from '@/lib/money';
import { listProducts } from '../queries';
import ProductStatusBadge from './product-status';
import { UpdateProduct, ProductStatusActions } from './product-buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import { ButtonLink } from '@/app/ui/button';

/**
 * Admin product list.
 *
 * Fetches its own page of data so it can stream behind a `<Suspense>` boundary.
 *
 * The thumbnail is square with a `rounded` corner, not `rounded-full`. A circular
 * crop on a photograph of a whole fish cuts the head and tail off the one thing
 * the operator is trying to recognise, and it was the same generic gesture the
 * storefront removed from its own grid.
 */
export default async function ProductTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const { items } = await listProducts(query, currentPage);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={CubeIcon}
          title={
            query ? 'Sin coincidencias' : 'Todavía no hay productos'
          }
          description={
            query
              ? `Ningún producto coincide con “${query}”. Revisa el nombre o el SKU.`
              : 'Crea el primero para empezar a vender. Puedes dejarlo en borrador hasta que esté listo.'
          }
          action={
            query ? null : (
              <ButtonLink href="/dashboard/products/create">
                Crear producto
              </ButtonLink>
            )
          }
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((product) => (
          <RecordCard
            key={product.id}
            title={product.name}
            subtitle={product.sku}
            badge={<ProductStatusBadge status={product.status} />}
            rows={[
              {
                label: 'Precio',
                value: formatCentavos(product.priceCents),
                numeric: true,
              },
              {
                label: 'Disponible',
                value:
                  product.reserved > 0
                    ? `${product.available} (${product.reserved} res.)`
                    : product.available,
                numeric: true,
              },
              { label: 'Categoría', value: product.categoryName ?? '—' },
              {
                label: 'Unidad',
                value:
                  product.unitType === 'pack' && product.netWeightGrams
                    ? `Paquete · ${product.netWeightGrams} g`
                    : 'Por pieza',
              },
            ]}
            actions={
              <>
                <UpdateProduct id={product.id} name={product.name} />
                <ProductStatusActions
                  id={product.id}
                  name={product.name}
                  status={product.status}
                />
              </>
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
            <TH>Categoría</TH>
            <TH align="right">Precio</TH>
            <TH align="right">Disponible</TH>
            <TH>Estado</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {items.map((product) => (
              <TR key={product.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded border border-line bg-subtle">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {product.name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {product.unitType === 'pack' && product.netWeightGrams
                          ? `Paquete · ${product.netWeightGrams} g`
                          : 'Por pieza'}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD muted className="whitespace-nowrap font-mono text-xs">
                  {product.sku}
                </TD>
                <TD muted className="whitespace-nowrap">
                  {product.categoryName ?? '—'}
                </TD>
                <TD numeric className="whitespace-nowrap font-medium">
                  {formatCentavos(product.priceCents)}
                </TD>
                <TD numeric className="whitespace-nowrap">
                  {product.available}
                  {product.reserved > 0 ? (
                    <span className="ml-1 text-xs text-ink-muted">
                      ({product.reserved} res.)
                    </span>
                  ) : null}
                </TD>
                <TD>
                  <ProductStatusBadge status={product.status} />
                </TD>
                <TD>
                  {/*
                    Row actions sit right and stay quiet until the row is
                    hovered. They are present for a keyboard user at all times —
                    hiding them behind `group-hover` would make them
                    unreachable by tab, which is how a lot of admin tables
                    quietly lock out keyboard operators.
                  */}
                  <div className="flex items-center justify-end gap-1.5">
                    <UpdateProduct id={product.id} name={product.name} />
                    <ProductStatusActions
                      id={product.id}
                      name={product.name}
                      status={product.status}
                    />
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
