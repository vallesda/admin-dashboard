import { TruckIcon } from '@heroicons/react/24/outline';

import { listZones } from '../queries';
import { CreateZone, EditZone, DeleteZone } from './zone-buttons';
import { TableShell, Table, THead, TH, TBody, TR, TD } from '@/app/ui/kit/table';
import RecordCard from '@/app/ui/kit/record-card';
import EmptyState from '@/app/ui/kit/empty-state';
import Badge from '@/app/ui/kit/badge';
import { formatCentavos } from '@/lib/money';

/**
 * Las zonas de reparto.
 *
 * El estado vacío no es decorativo: **sin ninguna zona, la tienda no entrega a
 * ningún lado**. Un código postal que no cae en una zona activa se responde
 * como fuera de cobertura, así que esta pantalla vacía significa que el checkout
 * a domicilio está apagado. Vale la pena decirlo con todas sus letras.
 */
export default async function ZoneTable() {
  const zones = await listZones();

  if (zones.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={TruckIcon}
          title="No hay zonas de reparto"
          description="Sin zonas, la tienda no acepta pedidos a domicilio: todo código postal queda fuera de cobertura. Crea la primera para empezar a entregar."
          action={<CreateZone />}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 md:hidden">
        {zones.map((zone) => (
          <RecordCard
            key={zone.id}
            title={zone.name}
            subtitle={`${zone.postalCodeCount} código${zone.postalCodeCount === 1 ? '' : 's'} postal${zone.postalCodeCount === 1 ? '' : 'es'}`}
            badge={
              zone.active ? (
                <Badge tone="ok">Activa</Badge>
              ) : (
                <Badge tone="neutral">Inactiva</Badge>
              )
            }
            rows={[
              { label: 'Envío', value: formatCentavos(zone.feeCents) },
              {
                label: 'Gratis desde',
                value:
                  zone.freeOverCents != null
                    ? formatCentavos(zone.freeOverCents)
                    : '—',
              },
            ]}
            actions={
              <>
                <EditZone id={zone.id} name={zone.name} />
                <DeleteZone id={zone.id} name={zone.name} />
              </>
            }
          />
        ))}
      </div>

      <TableShell className="hidden md:block">
        <Table>
          <THead>
            <TH>Zona</TH>
            <TH align="right">Envío</TH>
            <TH align="right">Gratis desde</TH>
            <TH align="right">Códigos postales</TH>
            <TH>Estado</TH>
            <TH srOnly>Acciones</TH>
          </THead>
          <TBody>
            {zones.map((zone) => (
              <TR key={zone.id}>
                <TD className="font-medium">{zone.name}</TD>
                <TD numeric>{formatCentavos(zone.feeCents)}</TD>
                <TD numeric muted>
                  {zone.freeOverCents != null
                    ? formatCentavos(zone.freeOverCents)
                    : '—'}
                </TD>
                <TD numeric muted>
                  {/* Cero códigos postales es una zona que no cubre nada: existe
                      y no cotiza a nadie. Se marca porque desde la lista es
                      indistinguible de una que funciona. */}
                  {zone.postalCodeCount === 0 ? (
                    <span className="text-warn">sin códigos</span>
                  ) : (
                    zone.postalCodeCount
                  )}
                </TD>
                <TD>
                  {zone.active ? (
                    <Badge tone="ok">Activa</Badge>
                  ) : (
                    <Badge tone="neutral">Inactiva</Badge>
                  )}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <EditZone id={zone.id} name={zone.name} />
                    <DeleteZone id={zone.id} name={zone.name} />
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
