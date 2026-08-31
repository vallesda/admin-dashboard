import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { createZone, updateZone, deleteZone } from './service';
import { findZoneForPostalCode, listZones } from './queries';
import { quoteDelivery } from './quote';

/**
 * Zonas de reparto: servicio y consultas contra base real.
 *
 * Lo que se prueba aquí no se puede probar con funciones puras: que un código
 * postal no pueda estar en dos zonas, que desactivar una la saque de la
 * cotización sin borrarla, y que borrar una zona ya usada por un pedido esté
 * impedido por la clave foránea y no por buena voluntad.
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

const zone = (over: Partial<Parameters<typeof createZone>[0]> = {}) => ({
  name: 'San Pedro',
  feeCents: 5000,
  freeOverCents: 80000,
  sortOrder: 0,
  active: true,
  postalCodes: ['66220', '66230'],
  ...over,
});

describe('crear zonas', () => {
  it('guarda la zona y sus códigos postales', async () => {
    await createZone(zone());

    const zones = await listZones();
    expect(zones).toHaveLength(1);
    expect(zones[0].postalCodeCount).toBe(2);
  });

  it('rechaza un código postal que ya está en otra zona', async () => {
    await createZone(zone());

    // El índice único lo impediría igual; el servicio lo caza antes para poder
    // decir *cuál* choca y *con quién*, que es lo que necesita alguien pegando
    // 300 códigos desde una hoja de cálculo.
    await expect(
      createZone(zone({ name: 'Valle', postalCodes: ['66230', '66240'] })),
    ).rejects.toThrow(/66230 \(San Pedro\)/);
  });

  it('deja reordenar los códigos de la misma zona sin chocar consigo misma', async () => {
    const created = await createZone(zone());

    await expect(
      updateZone(created.id, zone({ postalCodes: ['66220', '66230', '66240'] })),
    ).resolves.toBeTruthy();

    expect((await listZones())[0].postalCodeCount).toBe(3);
  });
});

describe('cotizar por código postal', () => {
  it('encuentra la zona activa y aplica su tarifa', async () => {
    await createZone(zone());

    const found = await findZoneForPostalCode('66220');
    expect(quoteDelivery(found, 20000)).toMatchObject({
      covered: true,
      feeCents: 5000,
      reason: 'zone',
    });
  });

  it('regala el envío al cruzar el umbral', async () => {
    await createZone(zone());
    const found = await findZoneForPostalCode('66220');

    expect(quoteDelivery(found, 90000)).toMatchObject({
      feeCents: 0,
      reason: 'free_over_threshold',
    });
  });

  it('una zona desactivada deja de cotizar sin perder sus códigos', async () => {
    const created = await createZone(zone());
    await updateZone(created.id, zone({ active: false }));

    // Apagar es cómo la tienda deja de repartir en un sitio sin tirar los
    // códigos postales que tanto costó cargar.
    expect(await findZoneForPostalCode('66220')).toBeUndefined();
    expect((await listZones())[0].postalCodeCount).toBe(2);
  });

  it('un código fuera de toda zona no es «envío gratis»', async () => {
    await createZone(zone());

    const found = await findZoneForPostalCode('99999');
    expect(quoteDelivery(found, 20000)).toEqual({
      covered: false,
      reason: 'out_of_range',
    });
  });
});

describe('borrar zonas', () => {
  it('borra una zona que nadie usó', async () => {
    const created = await createZone(zone());
    await expect(deleteZone(created.id)).resolves.toBeUndefined();
    expect(await listZones()).toHaveLength(0);
  });

  it('impide borrar una zona con la que ya se cobró un pedido', async () => {
    const db = await testDb();
    const created = await createZone(zone());

    const [customer] = (
      await db.execute<{ id: string }>(sql`
        INSERT INTO customers (name, phone) VALUES ('Ana', '8112345678') RETURNING id
      `)
    ).rows;

    await db.execute(sql`
      INSERT INTO orders (customer_id, customer_name, customer_phone, fulfillment_type,
        payment_mode, subtotal_cents, delivery_fee_cents, total_cents,
        delivery_address, delivery_street, delivery_ext_number, delivery_neighborhood,
        delivery_city, delivery_state, delivery_postal_code,
        delivery_zone_id, delivery_zone_name, delivery_fee_reason)
      VALUES (${customer.id}, 'Ana', '8112345678', 'delivery', 'online',
        20000, 5000, 25000, 'Calle 1', 'Calle', '1', 'Centro', 'San Pedro',
        'Nuevo León', '66220', ${created.id}, 'San Pedro', 'zone')
    `);

    // La comprobación es la propia `ON DELETE RESTRICT`, no una consulta previa:
    // `DEL` no importa `SAL`, y cerrar ese ciclo por comodidad habría sido peor
    // que un mensaje algo más genérico.
    await expect(deleteZone(created.id)).rejects.toThrow(/Desactívala/);
  });
});
