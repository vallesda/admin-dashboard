import { UserGroupIcon } from '@heroicons/react/24/outline';

import { listCustomers } from '../queries';
import { UpdateCustomer } from './buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';
import { ButtonLink } from '@/app/ui/button';

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
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={UserGroupIcon}
          title={query ? 'Sin coincidencias' : 'Todavía no hay clientes'}
          description={
            query
              ? `Ningún cliente coincide con “${query}”. Prueba con el teléfono o parte del nombre.`
              : 'Crea el primero para poder registrar pedidos por teléfono.'
          }
          action={
            query ? null : (
              <ButtonLink href="/dashboard/customers/create">
                Crear cliente
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
        {items.map((customer) => (
          <RecordCard
            key={customer.id}
            title={customer.name}
            badge={<Phone value={customer.phone} />}
            rows={[
              { label: 'Correo', value: customer.email ?? 'Sin correo' },
              { label: 'Alta', value: dateFormat.format(customer.createdAt) },
            ]}
            actions={<UpdateCustomer id={customer.id} name={customer.name} />}
          />
        ))}
      </div>

      {/* Desktop */}
      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Nombre</TH>
            <TH>Teléfono</TH>
            <TH>Correo</TH>
            <TH>Alta</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {items.map((customer) => (
              <TR key={customer.id}>
                <TD className="whitespace-nowrap font-medium">
                  {customer.name}
                </TD>
                <TD className="whitespace-nowrap">
                  <Phone value={customer.phone} />
                </TD>
                <TD muted className="whitespace-nowrap">
                  {customer.email ?? '—'}
                </TD>
                <TD muted className="whitespace-nowrap">
                  {dateFormat.format(customer.createdAt)}
                </TD>
                <TD>
                  <div className="flex justify-end">
                    <UpdateCustomer id={customer.id} name={customer.name} />
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

/**
 * A phone that is really a placeholder is shown as missing data, not as a
 * number. These are the tutorial's customers, carried over so the legacy
 * invoices keep working; they disappear in F4.
 *
 * It is a `warn` badge because it is genuinely actionable — the shop confirms
 * every order by phone, so a customer without one cannot be served.
 */
function Phone({ value }: { value: string }) {
  if (value === MISSING_PHONE) {
    return <Badge tone="warn">Falta teléfono</Badge>;
  }

  return <span className="tabular-nums text-ink">{value}</span>;
}
