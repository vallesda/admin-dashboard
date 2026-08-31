import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { createOrder, changeOrderStatus } from './service';
import { recordPayment } from '@/modules/payments/service';
import { inventory, inventoryMovements } from '@/db/schema/inventory';
import { orders } from '@/db/schema/sales';

/**
 * El flujo completo de un pedido, contra los servicios reales y una base real.
 *
 * Esto es lo que faltaba. Las 106 pruebas anteriores cubrían reglas puras —qué
 * transición es legal, cuánto cuesta un envío—; ninguna comprobaba que
 * `createOrder` reserve de verdad, que completar descuente, que cancelar
 * devuelva, o que las tres cosas ocurran dentro de una transacción.
 *
 * Los bugs que aparecieron operando este panel (`itemCount` siempre 0, la
 * categoría que se borraba al editar, el producto invisible sin inventario)
 * fallaban **en silencio**. Esta es la clase de prueba que los atrapa.
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

type Seed = { customerId: string; productId: string; actorId: string };

async function seed(opts: { onHand?: number; supplyType?: string } = {}): Promise<Seed> {
  const db = await testDb();

  const [customer] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO customers (name, phone) VALUES ('Ana', '8112345678') RETURNING id
    `)
  ).rows;

  /*
   * Un cobro manual necesita autor: `payments_manual_has_actor` exige que todo
   * cobro tenga alguien responsable, persona o proveedor, y nunca ninguno de
   * los dos. La primera versión de estas pruebas pasaba `actorId: null` y la
   * base la rechazó — la restricción haciendo su trabajo.
   */
  const [actor] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO admin_users (name, email, password_hash, role)
      VALUES ('Mostrador', 'mostrador@test.mx', 'x', 'admin') RETURNING id
    `)
  ).rows;

  const preorder = opts.supplyType === 'preorder';

  const [product] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status, supply_type,
        preorder_cutoff_weekday, preorder_cutoff_hour, preorder_arrival_weekday)
      VALUES ('ATU-1K', 'Atún aleta amarilla', 'atun-aleta', 20000, 'piece', 'active',
        ${opts.supplyType ?? 'fresh'},
        ${preorder ? 2 : null}, ${preorder ? 18 : null}, ${preorder ? 5 : null})
      RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO inventory (product_id, on_hand, reserved)
    VALUES (${product.id}, ${opts.onHand ?? 10}, 0)
  `);

  return { customerId: customer.id, productId: product.id, actorId: actor.id };
}

async function stockOf(productId: string) {
  const db = await testDb();
  const [row] = await db
    .select({ onHand: inventory.onHand, reserved: inventory.reserved })
    .from(inventory)
    .where(eq(inventory.productId, productId));

  return row;
}

async function movementsOf(productId: string) {
  const db = await testDb();
  return db
    .select({
      type: inventoryMovements.type,
      onHandDelta: inventoryMovements.onHandDelta,
      reservedDelta: inventoryMovements.reservedDelta,
    })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(inventoryMovements.id);
}

/**
 * Lleva un pedido hasta entregado, cobrándolo por el camino.
 *
 * El cobro no es un adorno de la prueba: la puerta P3 impide llegar a
 * `completed` sin uno, y la primera versión de estas pruebas falló justo ahí —
 * la regla funcionando, la prueba olvidándola.
 */
async function completeOrder(orderId: string, totalCents: number, actorId: string) {
  for (const next of ['confirmed', 'preparing', 'ready'] as const) {
    await changeOrderStatus(orderId, next, null);
  }

  await recordPayment({
    orderId,
    provider: 'cash',
    amountCents: totalCents,
    actorId,
    note: 'prueba',
  });

  return changeOrderStatus(orderId, 'completed', null);
}

const orderInput = (s: Seed, quantity = 2) => ({
  customerId: s.customerId,
  fulfillmentType: 'pickup' as const,
  paymentMode: 'on_site' as const,
  deliveryAddress: null,
  notes: null,
  waiveDeliveryFeeNote: null,
  lines: [{ productId: s.productId, quantity }],
});

describe('crear un pedido aparta, no vende', () => {
  it('sube `reserved` y deja `on_hand` intacto', async () => {
    const s = await seed({ onHand: 10 });

    await createOrder(orderInput(s, 3), null);

    // El pescado sigue en la cámara: sólo dejó de estar disponible.
    expect(await stockOf(s.productId)).toEqual({ onHand: 10, reserved: 3 });
  });

  it('escribe un movimiento `reserve` con el pedido', async () => {
    const s = await seed();
    await createOrder(orderInput(s, 2), null);

    expect(await movementsOf(s.productId)).toEqual([
      { type: 'reserve', onHandDelta: 0, reservedDelta: 2 },
    ]);
  });

  it('congela nombre y precio en la línea (RN-005)', async () => {
    const db = await testDb();
    const s = await seed();
    const order = await createOrder(orderInput(s, 2), null);

    // Cambiar el catálogo mañana no debe reescribir lo que se vendió hoy.
    await db.execute(sql`UPDATE products SET name = 'Otro nombre', price_cents = 99900`);

    const [line] = (
      await db.execute<{ product_name: string; unit_price_cents: number }>(sql`
        SELECT product_name, unit_price_cents FROM order_items WHERE order_id = ${order.id}
      `)
    ).rows;

    expect(line.product_name).toBe('Atún aleta amarilla');
    expect(Number(line.unit_price_cents)).toBe(20000);
  });

  it('el servidor calcula el total (RN-008)', async () => {
    const s = await seed();
    const order = await createOrder(orderInput(s, 3), null);

    expect(order.subtotalCents).toBe(60000);
    expect(order.totalCents).toBe(60000);
  });
});

describe('no se vende más de lo disponible (RN-003)', () => {
  it('rechaza pedir más de lo que hay, y no deja rastro', async () => {
    const s = await seed({ onHand: 2 });

    await expect(createOrder(orderInput(s, 3), null)).rejects.toThrow(/Solo hay 2/);

    // La transacción entera se deshace: ni pedido, ni reserva, ni movimiento.
    expect(await stockOf(s.productId)).toEqual({ onHand: 2, reserved: 0 });
    expect(await movementsOf(s.productId)).toHaveLength(0);

    const db = await testDb();
    const count = await db.select({ id: orders.id }).from(orders);
    expect(count).toHaveLength(0);
  });

  it('cuenta lo ya reservado, no sólo lo físico', async () => {
    const s = await seed({ onHand: 5 });
    await createOrder(orderInput(s, 4), null);

    // Quedan 5 en la cámara pero sólo 1 disponible.
    await expect(createOrder(orderInput(s, 2), null)).rejects.toThrow(/Solo hay 1/);
  });

  it('rechaza un producto que no está activo', async () => {
    const db = await testDb();
    const s = await seed();
    await db.execute(sql`UPDATE products SET status = 'draft'`);

    await expect(createOrder(orderInput(s), null)).rejects.toThrow(/no está activo/);
  });
});

describe('completar convierte la reserva en venta', () => {
  it('baja `on_hand` y `reserved` a la vez', async () => {
    const s = await seed({ onHand: 10 });
    const order = await createOrder(orderInput(s, 3), null);
    await completeOrder(order.id, order.totalCents, s.actorId);

    // El pescado salió *y* la promesa se cumplió: los dos deltas, iguales.
    expect(await stockOf(s.productId)).toEqual({ onHand: 7, reserved: 0 });
    expect(await movementsOf(s.productId)).toEqual([
      { type: 'reserve', onHandDelta: 0, reservedDelta: 3 },
      { type: 'sale', onHandDelta: -3, reservedDelta: -3 },
    ]);
  });

  it('los estados intermedios no mueven nada', async () => {
    const s = await seed();
    const order = await createOrder(orderInput(s, 2), null);

    await changeOrderStatus(order.id, 'confirmed', null);
    await changeOrderStatus(order.id, 'preparing', null);

    // Apartar ocurre una vez, al principio. Confirmar y preparar son señales
    // para las personas, no para la cámara.
    expect(await movementsOf(s.productId)).toHaveLength(1);
  });
});

describe('cancelar devuelve lo apartado', () => {
  it('baja `reserved` y no toca `on_hand`', async () => {
    const s = await seed({ onHand: 10 });
    const order = await createOrder(orderInput(s, 4), null);

    await changeOrderStatus(order.id, 'cancelled', null);

    // Nada salió nunca de la cámara.
    expect(await stockOf(s.productId)).toEqual({ onHand: 10, reserved: 0 });
    expect(await movementsOf(s.productId)).toEqual([
      { type: 'reserve', onHandDelta: 0, reservedDelta: 4 },
      { type: 'release', onHandDelta: 0, reservedDelta: -4 },
    ]);
  });

  it('libera para que otro pedido pueda comprar', async () => {
    const s = await seed({ onHand: 5 });
    const first = await createOrder(orderInput(s, 5), null);

    await expect(createOrder(orderInput(s, 1), null)).rejects.toThrow();
    await changeOrderStatus(first.id, 'cancelled', null);

    await expect(createOrder(orderInput(s, 1), null)).resolves.toBeTruthy();
  });
});

describe('por encargo: ni reserva ni venta (RN-016)', () => {
  it('crea el pedido con existencia cero y no escribe movimientos', async () => {
    const s = await seed({ onHand: 0, supplyType: 'preorder' });

    const order = await createOrder(orderInput(s, 3), null);

    expect(await stockOf(s.productId)).toEqual({ onHand: 0, reserved: 0 });
    expect(await movementsOf(s.productId)).toHaveLength(0);
    expect(order.promisedFor).toBeInstanceOf(Date);
  });

  it('se puede completar sin romper el inventario', async () => {
    const s = await seed({ onHand: 0, supplyType: 'preorder' });
    const order = await createOrder(orderInput(s, 2), null);

    // Sin el filtro de `stockBearingLines`, el `sale` empujaría `reserved` a −2
    // y el CHECK rechazaría la transacción: el pedido sería incompletable.
    await expect(
      completeOrder(order.id, order.totalCents, s.actorId),
    ).resolves.toBeTruthy();

    expect(await movementsOf(s.productId)).toHaveLength(0);
  });

  it('cancelar tampoco escribe nada', async () => {
    const s = await seed({ onHand: 0, supplyType: 'preorder' });
    const order = await createOrder(orderInput(s, 2), null);

    await changeOrderStatus(order.id, 'cancelled', null);
    expect(await movementsOf(s.productId)).toHaveLength(0);
  });
});
