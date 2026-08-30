import 'server-only';

/**
 * DEL — administrar zonas de reparto.
 */
import { and, eq, inArray, notInArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  deliveryZones,
  deliveryZonePostalCodes,
  type DeliveryZoneRow,
} from '@/db/schema/delivery';
import {
  ConflictError,
  NotFoundError,
  isForeignKeyViolation,
} from '@/lib/errors';
import type { ZoneInput } from './validators';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Comprueba que ningún código postal pertenezca ya a otra zona.
 *
 * El índice único lo impediría igual, pero el error que produce nombra un
 * índice y no dice cuál código ni de quién es. Alguien pegando 300 códigos
 * postales desde una hoja de cálculo necesita saber exactamente cuáles chocan.
 */
async function assertCodesFree(
  tx: Tx,
  codes: string[],
  exceptZoneId: string | null,
): Promise<void> {
  if (codes.length === 0) return;

  const clashes = await tx
    .select({
      postalCode: deliveryZonePostalCodes.postalCode,
      zoneName: deliveryZones.name,
    })
    .from(deliveryZonePostalCodes)
    .innerJoin(
      deliveryZones,
      eq(deliveryZones.id, deliveryZonePostalCodes.zoneId),
    )
    .where(
      exceptZoneId
        ? and(
            inArray(deliveryZonePostalCodes.postalCode, codes),
            notInArray(deliveryZonePostalCodes.zoneId, [exceptZoneId]),
          )
        : inArray(deliveryZonePostalCodes.postalCode, codes),
    );

  if (clashes.length > 0) {
    const sample = clashes
      .slice(0, 5)
      .map((c) => `${c.postalCode} (${c.zoneName})`)
      .join(', ');

    throw new ConflictError(
      'zone.postal_code_taken',
      `Estos códigos postales ya están en otra zona: ${sample}${clashes.length > 5 ? '…' : ''}`,
      'postalCodes',
    );
  }
}

/**
 * Reemplaza los códigos postales de una zona por el conjunto dado.
 *
 * Borra y vuelve a insertar en vez de calcular un diff. Es una tabla de
 * asociación sin historia propia —nada apunta a estas filas— así que el diff
 * sería complejidad sin comprador.
 */
async function replaceCodes(
  tx: Tx,
  zoneId: string,
  codes: string[],
): Promise<void> {
  await tx
    .delete(deliveryZonePostalCodes)
    .where(eq(deliveryZonePostalCodes.zoneId, zoneId));

  if (codes.length > 0) {
    await tx
      .insert(deliveryZonePostalCodes)
      .values(codes.map((postalCode) => ({ zoneId, postalCode })));
  }
}

export async function createZone(input: ZoneInput): Promise<DeliveryZoneRow> {
  return db.transaction(async (tx) => {
    await assertCodesFree(tx, input.postalCodes, null);

    const [zone] = await tx
      .insert(deliveryZones)
      .values({
        name: input.name,
        feeCents: input.feeCents,
        freeOverCents: input.freeOverCents,
        sortOrder: input.sortOrder,
        active: input.active,
      })
      .returning();

    await replaceCodes(tx, zone.id, input.postalCodes);

    return zone;
  });
}

export async function updateZone(
  id: string,
  input: ZoneInput,
): Promise<DeliveryZoneRow> {
  return db.transaction(async (tx) => {
    await assertCodesFree(tx, input.postalCodes, id);

    const [zone] = await tx
      .update(deliveryZones)
      .set({
        name: input.name,
        feeCents: input.feeCents,
        freeOverCents: input.freeOverCents,
        sortOrder: input.sortOrder,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(eq(deliveryZones.id, id))
      .returning();

    if (!zone) throw new NotFoundError('la zona', id);

    await replaceCodes(tx, zone.id, input.postalCodes);

    return zone;
  });
}

/**
 * Borra una zona a la que ningún pedido apunta.
 *
 * La comprobación es la propia `ON DELETE RESTRICT` de la base, no una consulta
 * previa sobre `orders`. Es deliberado: **`DEL` no importa `SAL`.** Cotizar el
 * envío es una entrada del pedido, igual que lo es el catálogo, así que la
 * flecha va `SAL → DEL`; consultar pedidos desde aquí para dar un mensaje más
 * bonito cerraría el ciclo por comodidad.
 *
 * Un pedido guarda el id de la zona que lo cotizó, así que borrar una zona ya
 * usada rompería la explicación de un cobro pasado. Para eso está desactivarla:
 * deja de cotizar y la historia se conserva.
 */
export async function deleteZone(id: string): Promise<void> {
  try {
    const deleted = await db
      .delete(deliveryZones)
      .where(eq(deliveryZones.id, id))
      .returning({ id: deliveryZones.id });

    if (deleted.length === 0) throw new NotFoundError('la zona', id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ConflictError(
        'zone.in_use',
        'No se puede borrar: hay pedidos cobrados con esta zona. Desactívala en su lugar.',
      );
    }

    throw error;
  }
}
