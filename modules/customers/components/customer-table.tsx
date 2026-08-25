import { listCustomers } from '../queries';
import { UpdateCustomer } from './buttons';

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeZone: 'America/Mexico_City',
});

/** Marks the tutorial rows that have no real phone yet (see migration 0005). */
const MISSING_PHONE = 'SIN TELEFONO';

export default async function CustomerTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const { items } = await listCustomers(query, currentPage);

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">
          {query
            ? `No hay clientes que coincidan con “${query}”.`
            : 'Todavía no hay clientes. Crea el primero para poder registrar pedidos.'}
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
            {items.map((customer) => (
              <div
                key={customer.id}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{customer.name}</p>
                    <Phone value={customer.phone} />
                  </div>
                  <UpdateCustomer id={customer.id} name={customer.name} />
                </div>
                <p className="pt-4 text-sm text-gray-500">
                  {customer.email ?? 'Sin correo'}
                </p>
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
                  Teléfono
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Correo
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Alta
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((customer) => (
                <tr
                  key={customer.id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3 font-medium">
                    {customer.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Phone value={customer.phone} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    {customer.email ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                    {dateFormat.format(customer.createdAt)}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end">
                      <UpdateCustomer id={customer.id} name={customer.name} />
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

/**
 * A phone that is really a placeholder is shown as missing data, not as a
 * number. These are the tutorial's customers, carried over so the legacy
 * invoices keep working; they disappear in F4.
 */
function Phone({ value }: { value: string }) {
  if (value === MISSING_PHONE) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">
        Falta teléfono
      </span>
    );
  }

  return <span className="text-gray-500">{value}</span>;
}
