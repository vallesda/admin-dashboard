import Image from 'next/image';

import { formatCentavos } from '@/lib/money';
import { listProducts } from '../queries';
import ProductStatusBadge from './product-status';
import { UpdateProduct, ProductStatusActions } from './product-buttons';

/**
 * Admin product list.
 *
 * Fetches its own page of data so it can stream behind a `<Suspense>` boundary,
 * same as `app/ui/invoices/table.tsx`.
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
      <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          {query
            ? `No hay productos que coincidan con “${query}”.`
            : 'Todavía no hay productos. Crea el primero para empezar a vender.'}
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
            {items.map((product) => (
              <div
                key={product.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="font-mono text-sm text-gray-500">
                      {product.sku}
                    </p>
                  </div>
                  <ProductStatusBadge status={product.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium tabular-nums">
                      {formatCentavos(product.priceCents)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {product.categoryName ?? 'Sin categoría'} ·{' '}
                      {product.available} disp.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <UpdateProduct id={product.id} name={product.name} />
                    <ProductStatusActions
                      id={product.id}
                      name={product.name}
                      status={product.status}
                    />
                  </div>
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
                <th scope="col" className="px-3 py-5 font-medium">
                  Categoría
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Precio
                </th>
                <th scope="col" className="px-3 py-5 text-right font-medium">
                  Disponible
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Estado
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((product) => (
                <tr
                  key={product.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.unitType === 'pack' &&
                        product.netWeightGrams ? (
                          <p className="text-xs text-gray-500">
                            Paquete · {product.netWeightGrams} g
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">Por pieza</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-gray-500">
                    {product.sku}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    {product.categoryName ?? '—'}
                  </td>
                  {/* tabular-nums so prices and stock line up down the column */}
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatCentavos(product.priceCents)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {product.available}
                    {product.reserved > 0 ? (
                      <span className="ml-1 text-xs text-gray-500">
                        ({product.reserved} res.)
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <ProductStatusBadge status={product.status} />
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center justify-end gap-3">
                      <UpdateProduct id={product.id} name={product.name} />
                      <ProductStatusActions
                        id={product.id}
                        name={product.name}
                        status={product.status}
                      />
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
