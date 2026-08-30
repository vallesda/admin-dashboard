import { Squares2X2Icon } from '@heroicons/react/24/outline';

import { listPackages } from '../queries';
import { CreatePackage, EditPackage, TogglePackage } from './package-buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';
import { ButtonLink } from '@/app/ui/button';

/**
 * The package list.
 *
 * The column that matters most is the last state one. A package can be
 * published, complete and correct on Monday and be quietly broken on Tuesday
 * because one of its pieces was archived — from the storefront that failure is
 * invisible, the line simply drops out of the bundle. "Incompleto" is how the
 * shop finds out before a customer does.
 */
export default async function PackageTable() {
  const items = await listPackages();

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Squares2X2Icon}
          title="Todavía no hay paquetes"
          description="Un paquete reúne todo lo que una receta necesita, para que el cliente lo pida de una vez."
          action={<CreatePackage />}
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
            key={item.id}
            title={item.name}
            subtitle={`/${item.slug}`}
            badge={<PackageState item={item} />}
            rows={[
              { label: 'Productos', value: item.itemCount, numeric: true },
              { label: 'Orden', value: item.sortOrder, numeric: true },
            ]}
            actions={
              <>
                <EditPackage id={item.id} name={item.name} />
                <TogglePackage
                  id={item.id}
                  name={item.name}
                  active={item.active}
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
            <TH>Paquete</TH>
            <TH>URL</TH>
            <TH align="right">Productos</TH>
            <TH align="right">Orden</TH>
            <TH>Estado</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {items.map((item) => (
              <TR key={item.id}>
                <TD>
                  <p className="font-medium text-ink">{item.name}</p>
                  {item.tagline ? (
                    <p className="text-xs text-ink-muted">{item.tagline}</p>
                  ) : null}
                </TD>
                <TD muted className="whitespace-nowrap font-mono text-xs">
                  /{item.slug}
                </TD>
                <TD numeric className="whitespace-nowrap">
                  {item.itemCount}
                </TD>
                <TD numeric muted className="whitespace-nowrap">
                  {item.sortOrder}
                </TD>
                <TD>
                  <PackageState item={item} />
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1.5">
                    <EditPackage id={item.id} name={item.name} />
                    <TogglePackage
                      id={item.id}
                      name={item.name}
                      active={item.active}
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

/**
 * One badge carrying the answer to "is this thing sellable right now?".
 *
 * The three states are ordered by how much they need a person: a published
 * package missing pieces is the one to fix today, an empty one is unfinished
 * work, and everything else is fine.
 */
function PackageState({
  item,
}: {
  item: { active: boolean; itemCount: number; inactiveCount: number };
}) {
  if (item.itemCount === 0) return <Badge tone="warn">Sin productos</Badge>;
  if (item.inactiveCount > 0) {
    return (
      <Badge tone="danger">
        Incompleto ({item.inactiveCount} no {item.inactiveCount === 1 ? 'activo' : 'activos'})
      </Badge>
    );
  }
  return item.active ? (
    <Badge tone="ok">Publicado</Badge>
  ) : (
    <Badge tone="neutral">Borrador</Badge>
  );
}
