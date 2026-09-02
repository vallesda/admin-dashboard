import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { inventory, inventoryMovements } from '@/db/schema/inventory';
import { receiveStock, adjustStock, availableOf } from './service';

/**
 * Recibir y ajustar existencia, contra una base real.
 *
 * `DOCS/PLAN-PRUEBAS.md §4.1` marca el ajuste negativo como «la operación más
 * peligrosa del panel», y lo es por una razón concreta: es la única que puede
 * **restar** unidades que ya están prometidas a un pedido. Si baja de
 * `reserved`, la tienda le ha vendido a alguien algo que ya no existe.
 *
 * Se prueba contra Postgres y no con dobles porque las dos defensas viven en
 * capas distintas: el servicio lanza un error legible y la restricción
 * `inventory_reserved_within_on_hand` lo impide pase lo que pase. Un doble sólo
 * comprobaría la primera.
 */
beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

/** Un producto con su fila de inventario. `reserved` se siembra a mano. */
async function seed(opts: { onHand?: number; reserved?: number } = {}) {
  const db = await testDb();

  const [product] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status)
      VALUES ('ATU-1K', 'Atún aleta amarilla', 'atun-aleta', 20000, 'piece', 'active')
      RETURNING id
    `)
  ).rows;

  const [actor] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO admin_users (name, email, password_hash, role)
      VALUES ('Mostrador', 'mostrador@test.mx', 'x', 'admin') RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO inventory (product_id, on_hand, reserved)
    VALUES (${product.id}, ${opts.onHand ?? 0}, ${opts.reserved ?? 0})
  `);

  return { productId: product.id, actorId: actor.id };
}

async function stockOf(productId: string) {
  const db = await testDb();
  const [row] = await db
    .select({ onHand: inventory.onHand, reserved: inventory.reserved })
    .from(inventory)
    .where(eq(inventory.productId, productId));
  return row;
}

async function ledgerOf(productId: string) {
  const db = await testDb();
  return db
    .select({
      type: inventoryMovements.type,
      onHandDelta: inventoryMovements.onHandDelta,
      note: inventoryMovements.note,
      createdBy: inventoryMovements.createdBy,
    })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(inventoryMovements.id);
}

describe('recibir mercancía', () => {
  it('suma a lo que ya había y deja constancia de quién', async () => {
    const { productId, actorId } = await seed({ onHand: 4 });

    await receiveStock({ productId, quantity: 6, note: 'Entrada del martes' }, actorId);

    expect(await stockOf(productId)).toEqual({ onHand: 10, reserved: 0 });
    expect(await ledgerOf(productId)).toEqual([
      { type: 'receive', onHandDelta: 6, note: 'Entrada del martes', createdBy: actorId },
    ]);
  });

  it('no toca lo reservado', async () => {
    // Recibir producto no libera lo prometido: son dos números independientes.
    const { productId, actorId } = await seed({ onHand: 5, reserved: 3 });

    await receiveStock({ productId, quantity: 5, note: null }, actorId);

    expect(await stockOf(productId)).toEqual({ onHand: 10, reserved: 3 });
  });

  it('falla con un producto que no tiene inventario', async () => {
    const { actorId } = await seed();
    const fantasma = '00000000-0000-0000-0000-000000000000';

    await expect(
      receiveStock({ productId: fantasma, quantity: 1, note: null }, actorId),
    ).rejects.toThrow(/inventario/i);
  });
});

describe('ajustar existencia', () => {
  it('sube y escribe un movimiento de ajuste', async () => {
    const { productId, actorId } = await seed({ onHand: 4 });

    await adjustStock({ productId, quantity: 3, note: 'Recuento' }, actorId);

    expect(await stockOf(productId)).toEqual({ onHand: 7, reserved: 0 });
    expect((await ledgerOf(productId))[0]).toMatchObject({
      type: 'adjustment',
      onHandDelta: 3,
    });
  });

  it('baja cuando no hay nada prometido', async () => {
    const { productId, actorId } = await seed({ onHand: 10 });

    await adjustStock({ productId, quantity: -4, note: 'Merma' }, actorId);

    expect(await stockOf(productId)).toEqual({ onHand: 6, reserved: 0 });
  });

  it('LA REGLA: no baja por debajo de lo reservado', async () => {
    // 10 en cámara, 6 prometidos a pedidos. Quitar 5 dejaría 5 físicos para
    // cubrir 6 promesas: alguien se queda sin su pescado.
    const { productId, actorId } = await seed({ onHand: 10, reserved: 6 });

    await expect(
      adjustStock({ productId, quantity: -5, note: 'Merma' }, actorId),
    ).rejects.toThrow(/reservad/i);

    // Y no deja rastro: ni el número cambia ni el libro registra un intento.
    expect(await stockOf(productId)).toEqual({ onHand: 10, reserved: 6 });
    expect(await ledgerOf(productId)).toHaveLength(0);
  });

  it('permite bajar exactamente hasta lo reservado', async () => {
    // El límite es inclusivo: dejar justo lo prometido sigue siendo coherente.
    const { productId, actorId } = await seed({ onHand: 10, reserved: 6 });

    await adjustStock({ productId, quantity: -4, note: 'Merma' }, actorId);

    expect(await stockOf(productId)).toEqual({ onHand: 6, reserved: 6 });
    expect(availableOf(await stockOf(productId))).toBe(0);
  });

  it('no deja la existencia en negativo', async () => {
    const { productId, actorId } = await seed({ onHand: 2 });

    await expect(
      adjustStock({ productId, quantity: -5, note: 'Merma' }, actorId),
    ).rejects.toThrow(/-3|Hay 2/);

    expect(await stockOf(productId)).toEqual({ onHand: 2, reserved: 0 });
  });

  it('el mensaje dice cuánto hay, no sólo que no se puede', async () => {
    const { productId, actorId } = await seed({ onHand: 10, reserved: 6 });

    // Un operador que ve «no se puede» vuelve a intentarlo igual. Uno que ve el
    // número sabe qué escribir en el segundo intento.
    await expect(
      adjustStock({ productId, quantity: -7, note: 'Merma' }, actorId),
    ).rejects.toThrow(/6/);
  });
});
