import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { findByPhone } from './service';

/**
 * Encontrar al cliente por su teléfono.
 *
 * Corre en **cada checkout** —es lo primero que hace `createOrder` antes de
 * decidir si crea un cliente nuevo— y no tenía ni una prueba. Lo que protege es
 * que un comprador que ya pidió antes no se duplique en la base cada vez que
 * escribe su número con guiones distintos.
 *
 * La normalización vive en SQL (`regexp_replace`) y en TypeScript
 * (`normalizePhone`), y las dos tienen que estar de acuerdo. Es exactamente la
 * clase de pareja que se desincroniza sin que nadie lo note, porque el síntoma
 * —clientes duplicados— tarda semanas en verse y parece un problema de datos.
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

async function seedCustomer(phone: string) {
  const db = await testDb();
  await db.execute(sql`
    INSERT INTO customers (name, phone) VALUES ('Ana Torres', ${phone})
  `);
}

describe('da igual cómo se escriba el número', () => {
  it('encuentra a quien se guardó con separadores', async () => {
    // El caso real: el mostrador lo tecleó bonito y el cliente lo escribe
    // corrido. Si esto falla, se crea un cliente duplicado en cada pedido.
    await seedCustomer('(81) 1234-5678');

    expect(await findByPhone('8112345678')).toBeDefined();
  });

  it('encuentra a quien se guardó corrido, buscando con separadores', async () => {
    await seedCustomer('8112345678');

    expect(await findByPhone('(81) 1234 5678')).toBeDefined();
  });

  it('ignora prefijos y espacios de más', async () => {
    await seedCustomer('81 1234 5678');

    expect(await findByPhone('  81-1234-5678  ')).toBeDefined();
  });
});

describe('cuándo NO debe encontrar', () => {
  it('otro número no es el mismo cliente', async () => {
    await seedCustomer('8112345678');

    expect(await findByPhone('8199999999')).toBeUndefined();
  });

  it('un número incompleto no busca nada', async () => {
    // Menos de diez dígitos se descarta antes de tocar la base: buscar por un
    // fragmento devolvería a cualquiera.
    await seedCustomer('8112345678');

    expect(await findByPhone('811234')).toBeUndefined();
  });

  it('no confunde a los clientes sin teléfono', async () => {
    // `DT-006`: hay filas del tutorial con el texto «SIN TELEFONO». Sin dígitos
    // dentro, no pueden coincidir con nadie.
    await seedCustomer('SIN TELEFONO');

    expect(await findByPhone('8112345678')).toBeUndefined();
  });
});
