import 'server-only';

/**
 * DEL — lecturas de zonas de reparto.
 */
import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  deliveryZones,
  deliveryZonePostalCodes,
  type DeliveryZoneRow,
} from '@/db/schema/delivery';
import type { ZoneForQuote } from './quote';

export type ZoneListItem = DeliveryZoneRow & { postalCodeCount: number };

/** Todas las zonas, con cuántos códigos postales cubre cada una. */
export async function listZones(): Promise<ZoneListItem[]> {
  const rows = await db
    .select({
      id: deliveryZones.id,
      name: deliveryZones.name,
      feeCents: deliveryZones.feeCents,
      freeOverCents: deliveryZones.freeOverCents,
      active: deliveryZones.active,
      sortOrder: deliveryZones.sortOrder,
      createdAt: deliveryZones.createdAt,
      updatedAt: deliveryZones.updatedAt,
      postalCodeCount: sql<number>`count(${deliveryZonePostalCodes.id})::int`,
    })
    .from(deliveryZones)
    .leftJoin(
      deliveryZonePostalCodes,
      eq(deliveryZonePostalCodes.zoneId, deliveryZones.id),
    )
    .groupBy(deliveryZones.id)
    .orderBy(asc(deliveryZones.sortOrder), asc(deliveryZones.name));

  return rows;
}

export async function getZoneById(
  id: string,
): Promise<(DeliveryZoneRow & { postalCodes: string[] }) | undefined> {
  const [zone] = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.id, id))
    .limit(1);

  if (!zone) return undefined;

  const codes = await db
    .select({ postalCode: deliveryZonePostalCodes.postalCode })
    .from(deliveryZonePostalCodes)
    .where(eq(deliveryZonePostalCodes.zoneId, id))
    .orderBy(asc(deliveryZonePostalCodes.postalCode));

  return { ...zone, postalCodes: codes.map((c) => c.postalCode) };
}

/**
 * La zona **activa** que cubre un código postal, o `undefined`.
 *
 * Filtra por `active` a propósito: apagar una zona es cómo la tienda deja de
 * repartir en un sitio sin borrar los códigos postales que tanto costó cargar.
 * Un pedido histórico sigue apuntando a ella por su id.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Acepta una transacción, y quien la tenga **debe** pasarla.
 *
 * `createOrder` llama a esto desde dentro de su transacción. Usando el `db`
 * global, la consulta pedía una **segunda** conexión mientras la primera seguía
 * ocupada — con PGlite, que tiene una sola, es un interbloqueo inmediato; con
 * el pool de producción no cuelga, pero cada pedido a domicilio retiene dos
 * conexiones a la vez y bajo carga el pool se agota con todas esperándose.
 *
 * Además leía fuera de la transacción: la tarifa se resolvía en una vista de la
 * base distinta de aquella en la que se estaba escribiendo el pedido.
 */
export async function findZoneForPostalCode(
  postalCode: string,
  tx?: Tx,
): Promise<ZoneForQuote | undefined> {
  if (!/^[0-9]{5}$/.test(postalCode)) return undefined;

  const [row] = await (tx ?? db)
    .select({
      id: deliveryZones.id,
      name: deliveryZones.name,
      feeCents: deliveryZones.feeCents,
      freeOverCents: deliveryZones.freeOverCents,
    })
    .from(deliveryZonePostalCodes)
    .innerJoin(
      deliveryZones,
      eq(deliveryZones.id, deliveryZonePostalCodes.zoneId),
    )
    .where(
      sql`${deliveryZonePostalCodes.postalCode} = ${postalCode} AND ${deliveryZones.active}`,
    )
    .limit(1);

  return row;
}
