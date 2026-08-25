import { listCategories } from '../queries';
import CategoryStatus from './category-status';
import { UpdateCategory, ToggleCategory } from './buttons';

/**
 * Admin list of categories.
 *
 * Server component that fetches its own data, so it can sit behind its own
 * `<Suspense>` boundary — same shape as `app/ui/invoices/table.tsx`.
 *
 * No search or pagination on purpose: a flat category list for one shop is tens
 * of rows. Products do need both (RF-CAT-004).
 */
export default async function CategoryTable() {
  const categories = await listCategories();

  if (categories.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          Todavía no hay categorías. Crea la primera para poder clasificar
          productos.
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
            {categories.map((category) => (
              <div
                key={category.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-500">/{category.slug}</p>
                  </div>
                  <CategoryStatus active={category.active} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    Orden {category.sortOrder}
                  </p>
                  <div className="flex justify-end gap-2">
                    <UpdateCategory id={category.id} name={category.name} />
                    <ToggleCategory
                      id={category.id}
                      name={category.name}
                      active={category.active}
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
                  Nombre
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  URL
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Orden
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
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3 font-medium">
                    {category.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    /{category.slug}
                  </td>
                  {/* Digits line up between rows, which is what makes the sort
                      order scannable at a glance. */}
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    {category.sortOrder}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <CategoryStatus active={category.active} />
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-3">
                      <UpdateCategory id={category.id} name={category.name} />
                      <ToggleCategory
                        id={category.id}
                        name={category.name}
                        active={category.active}
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
