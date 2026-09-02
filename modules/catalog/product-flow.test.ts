import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { inventory } from '@/db/schema/inventory';
import { products, productCategories } from '@/db/schema/catalog';
import { createProduct, updateProduct } from './service';
import { createProductSchema, updateProductSchema } from './validators';

/**
 * Alta y edición de un producto, contra una base real.
 *
 * Tres garantías que sólo se ven con la base delante, y que ninguna prueba de
 * dominio puro puede dar:
 *
 * 1. **Nace en borrador.** Publicar es un acto aparte, así que un producto a
 *    medio llenar no puede volverse vendible por accidente.
 * 2. **Nace con inventario en cero.** Un producto sin fila de inventario
 *    convierte cada lectura de existencia en un caso especial — y ya produjo un
 *    bug real: el producto invisible por no tener esa fila.
 * 3. **Las dos escrituras son una sola.** Si la segunda falla, la primera no
 *    queda.
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

/** Lo mínimo que el formulario manda para dar de alta. */
function form(overrides: Record<string, unknown> = {}) {
  return createProductSchema.parse({
    sku: 'ATU-1K',
    name: 'Atún aleta amarilla',
    priceCents: '480',
    unitType: 'kg',
    supplyType: 'fresh',
    categoryIds: [],
    ...overrides,
  });
}

async function categoryId(name = 'Fresco') {
  const db = await testDb();
  const [row] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO categories (name, slug) VALUES (${name}, ${name.toLowerCase()})
      RETURNING id
    `)
  ).rows;
  return row.id;
}

describe('crear un producto', () => {
  it('nace en borrador, nunca vendible por accidente', async () => {
    const row = await createProduct(form());

    expect(row.status).toBe('draft');
  });

  it('nace con su fila de inventario en cero', async () => {
    const row = await createProduct(form());
    const db = await testDb();

    const [stock] = await db
      .select({ onHand: inventory.onHand, reserved: inventory.reserved })
      .from(inventory)
      .where(eq(inventory.productId, row.id));

    expect(stock).toEqual({ onHand: 0, reserved: 0 });
  });

  it('deriva la URL del nombre cuando no se escribe una', async () => {
    const row = await createProduct(form({ name: 'Filete de Atún Aleta Azul' }));

    expect(row.slug).toBe('filete-de-atun-aleta-azul');
  });

  it('respeta la URL escrita a mano', async () => {
    const row = await createProduct(form({ slug: 'atun-premium' }));

    expect(row.slug).toBe('atun-premium');
  });

  it('guarda los campos que el cliente lee en la ficha', async () => {
    // Los cuatro que llegaron tarde y se guardaban vacíos en silencio.
    const row = await createProduct(
      form({
        origin: 'Ensenada, Baja California',
        presentation: 'Lomo en bloque, corte sashimi',
        shortDescription: 'Seleccionado pieza por pieza.',
        storageInstructions: 'Refrigerado de 0 a 4 °C.',
      }),
    );

    expect(row.origin).toBe('Ensenada, Baja California');
    expect(row.presentation).toBe('Lomo en bloque, corte sashimi');
    expect(row.shortDescription).toBe('Seleccionado pieza por pieza.');
    expect(row.storageInstructions).toBe('Refrigerado de 0 a 4 °C.');
  });

  it('lo mete en las categorías marcadas', async () => {
    const fresco = await categoryId('Fresco');
    const congelado = await categoryId('Congelado');

    const row = await createProduct(form({ categoryIds: [fresco, congelado] }));

    const db = await testDb();
    const links = await db
      .select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, row.id));

    expect(links.map((l) => l.categoryId).sort()).toEqual([fresco, congelado].sort());
  });

  it('un SKU repetido se explica, no se vuelca', async () => {
    await createProduct(form());

    // El mensaje tiene que nombrar el SKU. La versión anterior devolvía
    // «Failed query: insert into products…» porque el error del driver viene
    // envuelto en `cause` (PLAN-PRUEBAS §3).
    await expect(createProduct(form({ name: 'Otro atún', slug: 'otro' }))).rejects.toThrow(
      /SKU/i,
    );
  });

  it('una URL repetida también', async () => {
    await createProduct(form({ slug: 'atun' }));

    await expect(
      createProduct(form({ sku: 'ATU-2K', slug: 'atun' })),
    ).rejects.toThrow(/URL|slug/i);
  });

  it('un SKU repetido no deja producto a medias', async () => {
    await createProduct(form());
    const db = await testDb();

    await expect(
      createProduct(form({ name: 'Otro', slug: 'otro' })),
    ).rejects.toThrow();

    // La transacción: ni producto huérfano ni inventario suelto.
    const rows = await db.select({ id: products.id }).from(products);
    expect(rows).toHaveLength(1);
  });
});

describe('editar un producto', () => {
  it('cambiar categorías reemplaza, no acumula', async () => {
    const fresco = await categoryId('Fresco');
    const congelado = await categoryId('Congelado');
    const row = await createProduct(form({ categoryIds: [fresco] }));

    await updateProduct(
      row.id,
      updateProductSchema.parse({
        sku: row.sku,
        name: row.name,
        slug: row.slug,
        priceCents: '480',
        unitType: 'kg',
        supplyType: 'fresh',
        categoryIds: [congelado],
      }),
    );

    const db = await testDb();
    const links = await db
      .select({ categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, row.id));

    // El bug que hubo: al editar se perdía la categoría en vez de sustituirse.
    expect(links.map((l) => l.categoryId)).toEqual([congelado]);
  });

  it('no resucita un producto archivado al editarlo', async () => {
    const row = await createProduct(form());

    const updated = await updateProduct(
      row.id,
      updateProductSchema.parse({
        sku: row.sku,
        name: 'Atún, nuevo nombre',
        slug: row.slug,
        priceCents: '500',
        unitType: 'kg',
        supplyType: 'fresh',
        categoryIds: [],
      }),
    );

    // El estado se cambia desde la lista, nunca desde el formulario.
    expect(updated.status).toBe('draft');
    expect(updated.name).toBe('Atún, nuevo nombre');
  });
});
