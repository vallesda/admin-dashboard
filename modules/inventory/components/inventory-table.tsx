import Link from 'next/link';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

import { listInventory } from '../queries';
import StockBadge from './stock-badge';
import InitInventoryButton from './init-inventory-button';

/**
 * Stock levels across the catalogue.
 *
 * Fetches its own page so it can stream behind a `<Suspense>` boundary, like
 * the product table.
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
      <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          {lowOnly
            ? 'Ningún producto está por debajo de su umbral. '
            : query
              ? `No hay productos que coincidan con “${query}”.`
              : 'Todavía no hay productos con inventario.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          {/* Mobile */}
          <div className="md:hidden">
            {items.map((item) => (
              <div
                key={item.productId}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="font-mono text-sm text-gray-500">
                      {item.sku}
                    </p>
                  </div>
                  {item.hasInventory ? (
                    <StockBadge
                      available={item.available}
                      isLowStock={item.isLowStock}
                    />
                  ) : (
                    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
                      Sin inventario
                    </span>
                  )}
                </div>
                <div className="flex w-full items-center justify-between pt-4 text-sm text-gray-500">
                  <p className="tabular-nums">
                    {item.onHand} en mano · {item.reserved} reservado
                  </p>
                  {item.hasInventory ? (
                    <ManageLink id={item.productId} name={item.name} />
                  ) : (
                    <InitInventoryButton
                      productId={item.productId}
                      name={item.name}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Producto
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  SKU
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  En mano
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Reservado
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Disponible
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Umbral
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((item) => (
                <tr
                  key={item.productId}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3 font-medium">
                    {item.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-gray-500">
                    {item.sku}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {item.onHand}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-gray-500">
                    {item.reserved}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {item.hasInventory ? (
                      <StockBadge
                        available={item.available}
                        isLowStock={item.isLowStock}
                      />
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
                        Sin inventario
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-gray-500">
                    {item.lowStockThreshold}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ManageLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/dashboard/inventory/${id}`}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium hover:bg-gray-100"
    >
      <AdjustmentsHorizontalIcon className="w-4" />
      Gestionar
      <span className="sr-only"> {name}</span>
    </Link>
  );
}
