import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from './db';
import { initTestDb } from './db-alias';

/**
 * Las invariantes que viven en la base, no en el código.
 *
 * Estas son las reglas que el proyecto lleva meses poniendo en `CHECK` y
 * triggers en vez de en `if`, con el argumento de que una Server Action es un
 * endpoint público y un servicio no es la última línea de defensa. Nunca se
 * había comprobado que esas restricciones **existan y muerdan**.
 *
 * Se prueban contra las migraciones reales del repositorio: si alguien genera
 * una migración que se come un `CHECK`, esto falla.
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

/** Inserta lo mínimo para tener un producto vendible. */
async function seedProduct(
  opts: { onHand?: number; supplyType?: string; sku?: string } = {},
) {
  const db = await testDb();
  const sku = opts.sku ?? 'SKU-1';

  const [product] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status, supply_type,
        preorder_cutoff_weekday, preorder_cutoff_hour, preorder_arrival_weekday)
      VALUES (${sku}, ${'Atún ' + sku}, ${'atun-' + sku.toLowerCase()}, 20000, 'piece', 'active',
        ${opts.supplyType ?? 'fresh'},
        ${opts.supplyType === 'preorder' ? 2 : null},
        ${opts.supplyType === 'preorder' ? 18 : null},
        ${opts.supplyType === 'preorder' ? 5 : null})
      RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO inventory (product_id, on_hand, reserved)
    VALUES (${product.id}, ${opts.onHand ?? 10}, 0)
  `);

  return product.id;
}

describe('las migraciones se aplican', () => {
  it('crea el esquema completo', async () => {
    const db = await testDb();
    const tables = await db.execute<{ tablename: string }>(sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);

    const names = tables.rows.map((r) => r.tablename);

    for (const expected of [
      'admin_users',
      'categories',
      'customers',
      'delivery_zones',
      'inventory',
      'inventory_movements',
      'order_items',
      'orders',
      'payments',
      'product_categories',
      'products',
      'refunds',
    ]) {
      expect(names, `falta la tabla ${expected}`).toContain(expected);
    }
  });
});

describe('INV — el inventario no puede mentir', () => {
  it('rechaza reservar más de lo que hay (RN-003)', async () => {
    const db = await testDb();
    const productId = await seedProduct({ onHand: 5 });

    await expect(
      db.execute(sql`UPDATE inventory SET reserved = 6 WHERE product_id = ${productId}`),
    ).rejects.toThrow();
  });

  it('permite reservar exactamente lo que hay', async () => {
    const db = await testDb();
    const productId = await seedProduct({ onHand: 5 });

    await db.execute(sql`UPDATE inventory SET reserved = 5 WHERE product_id = ${productId}`);

    const [row] = (
      await db.execute<{ reserved: number }>(
        sql`SELECT reserved FROM inventory WHERE product_id = ${productId}`,
      )
    ).rows;

    expect(Number(row.reserved)).toBe(5);
  });

  it('rechaza existencia negativa', async () => {
    const db = await testDb();
    const productId = await seedProduct();

    await expect(
      db.execute(sql`UPDATE inventory SET on_hand = -1 WHERE product_id = ${productId}`),
    ).rejects.toThrow();
  });
});

describe('INV — el libro de movimientos es inmodificable', () => {
  async function seedMovement() {
    const db = await testDb();
    const productId = await seedProduct();

    await db.execute(sql`
      INSERT INTO inventory_movements (product_id, type, on_hand_delta, reserved_delta)
      VALUES (${productId}, 'receive', 5, 0)
    `);

    return productId;
  }

  it('un UPDATE sobre un movimiento lanza', async () => {
    const db = await testDb();
    await seedMovement();

    // No es una convención del código: es un trigger. Una corrección es un
    // `adjustment` nuevo, para que la historia se explique sola.
    await expect(
      db.execute(sql`UPDATE inventory_movements SET on_hand_delta = 99`),
    ).rejects.toThrow();
  });

  it('un DELETE sobre un movimiento lanza', async () => {
    const db = await testDb();
    await seedMovement();

    await expect(
      db.execute(sql`DELETE FROM inventory_movements`),
    ).rejects.toThrow();
  });

  it('rechaza un movimiento vacío', async () => {
    const db = await testDb();
    const productId = await seedProduct();

    await expect(
      db.execute(sql`
        INSERT INTO inventory_movements (product_id, type, on_hand_delta, reserved_delta)
        VALUES (${productId}, 'adjustment', 0, 0)
      `),
    ).rejects.toThrow();
  });

  it('rechaza un `reserve` que mueva existencia física', async () => {
    const db = await testDb();
    const productId = await seedProduct();

    // Reservar no saca pescado de la cámara. La forma de cada tipo de
    // movimiento es una regla de la base.
    await expect(
      db.execute(sql`
        INSERT INTO inventory_movements (product_id, type, on_hand_delta, reserved_delta)
        VALUES (${productId}, 'reserve', -1, 1)
      `),
    ).rejects.toThrow();
  });

  it('rechaza un `reserve` sin pedido', async () => {
    const db = await testDb();
    const productId = await seedProduct();

    await expect(
      db.execute(sql`
        INSERT INTO inventory_movements (product_id, type, on_hand_delta, reserved_delta)
        VALUES (${productId}, 'reserve', 0, 1)
      `),
    ).rejects.toThrow();
  });
});

describe('CAT — el ciclo de encargo está completo o no está', () => {
  it('rechaza un producto por encargo sin ciclo', async () => {
    const db = await testDb();

    await expect(
      db.execute(sql`
        INSERT INTO products (sku, name, slug, price_cents, unit_type, supply_type)
        VALUES ('X-1', 'Mejillones', 'mejillones', 28000, 'piece', 'preorder')
      `),
    ).rejects.toThrow();
  });

  it('rechaza un producto fresco *con* ciclo', async () => {
    const db = await testDb();

    // Basura que alguien leería dentro de seis meses creyendo que significa algo.
    await expect(
      db.execute(sql`
        INSERT INTO products (sku, name, slug, price_cents, unit_type, supply_type,
          preorder_cutoff_weekday, preorder_cutoff_hour, preorder_arrival_weekday)
        VALUES ('X-2', 'Atún', 'atun-2', 20000, 'piece', 'fresh', 2, 18, 5)
      `),
    ).rejects.toThrow();
  });

  it('acepta un encargo con su ciclo completo', async () => {
    await expect(seedProduct({ supplyType: 'preorder' })).resolves.toBeTruthy();
  });
});

describe('CAT — un producto vive en varias estanterías', () => {
  /** Crea una categoría y devuelve su id. */
  async function seedCategory(name: string, slug: string) {
    const db = await testDb();
    const [row] = (
      await db.execute<{ id: string }>(sql`
        INSERT INTO categories (name, slug) VALUES (${name}, ${slug}) RETURNING id
      `)
    ).rows;
    return row.id;
  }

  it('acepta que un filete sea Filetes y Fresco a la vez', async () => {
    const db = await testDb();
    const productId = await seedProduct();
    const filetes = await seedCategory('Filetes', 'filetes');
    const fresco = await seedCategory('Fresco', 'fresco');

    await db.execute(sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productId}, ${filetes}), (${productId}, ${fresco})
    `);

    const rows = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM product_categories WHERE product_id = ${productId}
    `);
    expect(rows.rows[0].n).toBe(2);
  });

  it('rechaza la misma categoría dos veces', async () => {
    const db = await testDb();
    const productId = await seedProduct();
    const filetes = await seedCategory('Filetes', 'filetes');

    await db.execute(sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productId}, ${filetes})
    `);

    // Pertenecer es un hecho, no una cantidad: dos filas iguales no
    // significan nada que una no diga ya.
    await expect(
      db.execute(sql`
        INSERT INTO product_categories (product_id, category_id)
        VALUES (${productId}, ${filetes})
      `),
    ).rejects.toThrow();
  });

  it('no deja borrar una categoría que todavía clasifica algo', async () => {
    const db = await testDb();
    const productId = await seedProduct();
    const filetes = await seedCategory('Filetes', 'filetes');

    await db.execute(sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productId}, ${filetes})
    `);

    // La misma protección que tenía la columna: borrar «Filetes» no puede
    // desclasificar doce productos en silencio.
    await expect(
      db.execute(sql`DELETE FROM categories WHERE id = ${filetes}`),
    ).rejects.toThrow();
  });

  it('al borrar el producto se lleva su pertenencia', async () => {
    const db = await testDb();
    const productId = await seedProduct();
    const filetes = await seedCategory('Filetes', 'filetes');

    await db.execute(sql`
      INSERT INTO product_categories (product_id, category_id)
      VALUES (${productId}, ${filetes})
    `);
    // El inventario referencia el producto y bloquearía el borrado; se quita
    // primero porque lo que se prueba aquí es la cascada de la tabla puente.
    await db.execute(sql`DELETE FROM inventory WHERE product_id = ${productId}`);
    await db.execute(sql`DELETE FROM products WHERE id = ${productId}`);

    const rows = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM product_categories
    `);
    expect(rows.rows[0].n).toBe(0);
  });
});

describe('CAT — una sola pesca de la semana', () => {
  it('rechaza un segundo producto marcado', async () => {
    const db = await testDb();
    const uno = await seedProduct({ sku: 'SKU-1' });
    const dos = await seedProduct({ sku: 'SKU-2' });

    await db.execute(
      sql`UPDATE products SET featured_item = true WHERE id = ${uno}`,
    );

    // La portada enseña una pieza. Con dos marcadas alguien tendría que elegir
    // —por nombre, o por fecha— y esa elección sería invisible: el operador
    // marca un producto y la portada sigue enseñando otro sin decir por qué.
    await expect(
      db.execute(
        sql`UPDATE products SET featured_item = true WHERE id = ${dos}`,
      ),
    ).rejects.toThrow();
  });

  it('deja a todos los demás en false a la vez', async () => {
    const db = await testDb();
    await seedProduct({ sku: 'SKU-1' });
    await seedProduct({ sku: 'SKU-2' });
    await seedProduct({ sku: 'SKU-3' });

    // El índice es parcial: sólo restringe las filas en `true`. Uno normal
    // sobre un booleano dejaría existir dos productos en todo el catálogo.
    const rows = await db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM products WHERE NOT featured_item
    `);
    expect(rows.rows[0].n).toBe(3);
  });

  it('permite mover la marca de un producto a otro', async () => {
    const db = await testDb();
    const uno = await seedProduct({ sku: 'SKU-1' });
    const dos = await seedProduct({ sku: 'SKU-2' });

    await db.execute(sql`UPDATE products SET featured_item = true WHERE id = ${uno}`);
    // Es lo que hace el servicio: apaga el anterior y enciende el nuevo, así
    // que desde el admin la restricción se comporta como un interruptor.
    await db.execute(sql`UPDATE products SET featured_item = false WHERE id = ${uno}`);
    await db.execute(sql`UPDATE products SET featured_item = true WHERE id = ${dos}`);

    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM products WHERE featured_item`,
    );
    expect(rows.rows.map((r) => r.id)).toEqual([dos]);
  });
});

describe('DEL — un código postal pertenece a una sola zona', () => {
  it('rechaza el mismo código postal en dos zonas', async () => {
    const db = await testDb();

    const zones = await db.execute<{ id: string }>(sql`
      INSERT INTO delivery_zones (name, fee_cents) VALUES ('A', 5000), ('B', 3000)
      RETURNING id
    `);

    await db.execute(sql`
      INSERT INTO delivery_zone_postal_codes (zone_id, postal_code)
      VALUES (${zones.rows[0].id}, '66220')
    `);

    // Si perteneciera a dos, no habría respuesta a «¿cuánto cuesta el envío?».
    await expect(
      db.execute(sql`
        INSERT INTO delivery_zone_postal_codes (zone_id, postal_code)
        VALUES (${zones.rows[1].id}, '66220')
      `),
    ).rejects.toThrow();
  });

  it('rechaza un código postal que no sean 5 dígitos', async () => {
    const db = await testDb();
    const [zone] = (
      await db.execute<{ id: string }>(
        sql`INSERT INTO delivery_zones (name, fee_cents) VALUES ('A', 5000) RETURNING id`,
      )
    ).rows;

    await expect(
      db.execute(sql`
        INSERT INTO delivery_zone_postal_codes (zone_id, postal_code)
        VALUES (${zone.id}, '662')
      `),
    ).rejects.toThrow();
  });
});
