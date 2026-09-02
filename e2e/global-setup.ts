import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Repone el inventario que estas pruebas consumen.
 *
 * Sin esto la suite se agota sola: cada corrida aparta producto de verdad y el
 * camino feliz **no lo devuelve** —el pedido queda pagado, que es el punto—, así
 * que a la sexta o séptima vez `buyableProduct()` no encuentra nada y la prueba
 * falla por falta de pescado en vez de por un fallo del código. Pasó al escribir
 * esta capa: la primera corrida en verde, la segunda sin stock.
 *
 * Un producto propio y no el catálogo real, por dos razones: no distorsiona los
 * números que el panel enseña, y deja obvio en el ledger qué movimiento fue una
 * prueba.
 *
 * La reposición es un movimiento `receive`, no un `UPDATE` a `on_hand`. El
 * ledger es append-only con `CHECK` que exigen la forma de cada tipo, así que
 * escribirlo bien es a la vez más honesto y lo único que la base acepta.
 */

export const E2E_SKU = 'E2E-PRUEBA';
export const E2E_SLUG = 'producto-de-prueba-e2e';
const TARGET_STOCK = 40;

function env(): Record<string, string> {
  const out: Record<string, string> = {};

  for (const file of ['.env', '.env.local']) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const line of raw.split('\n')) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      /* opcional */
    }
  }

  return { ...out, ...process.env } as Record<string, string>;
}

export default async function globalSetup(): Promise<void> {
  const url = env().POSTGRES_URL;

  if (!url) {
    throw new Error(
      'Falta POSTGRES_URL. Las pruebas E2E reponen inventario en la base de desarrollo.',
    );
  }

  /*
   * Un cinturón que no cuesta nada: estas pruebas escriben, y apuntarlas a la
   * base de producción sería exactamente el accidente que `test/db.ts` describe
   * haber sufrido tres veces con pruebas manuales.
   */
  if (/prod/i.test(url) && !/dev|local|staging/i.test(url)) {
    throw new Error(
      'POSTGRES_URL parece de producción. Las pruebas E2E escriben; apúntalas a desarrollo.',
    );
  }

  const sql = postgres(url, { ssl: 'require', max: 1 });

  try {
    const [product] = await sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status)
      VALUES (${E2E_SKU}, 'Producto de prueba E2E', ${E2E_SLUG}, 15000, 'piece', 'active')
      ON CONFLICT (sku) DO UPDATE SET status = 'active'
      RETURNING id
    `;

    /*
     * Con categoría, o la tienda no lo enseña.
     *
     * `/search` lista por colección, así que un producto sin pertenencias
     * existe en la API y **no aparece en ninguna página** — la primera versión
     * de esto falló ahí. Se le pone «Congelado» a propósito: es la categoría
     * cuyo producto no caduca, y así el pedido de prueba no compite con el
     * pescado del día.
     */
    await sql`
      INSERT INTO product_categories (product_id, category_id)
      SELECT ${product.id}, id FROM categories WHERE slug = 'producto-congelado'
      ON CONFLICT DO NOTHING
    `;

    await sql`
      INSERT INTO inventory (product_id, on_hand, reserved)
      VALUES (${product.id}, 0, 0)
      ON CONFLICT (product_id) DO NOTHING
    `;

    const [stock] = await sql<{ on_hand: number; reserved: number }[]>`
      SELECT on_hand, reserved FROM inventory WHERE product_id = ${product.id}
    `;

    /*
     * Contra lo **disponible**, no contra `on_hand`.
     *
     * Un pedido pagado retiene su reserva hasta que se entrega, y `on_hand` sólo
     * baja con un movimiento `sale`. Comparando contra `on_hand` la reposición
     * se cree innecesaria mientras `reserved` sube corrida tras corrida, y la
     * suite vuelve a morir por falta de stock — en silencio y semanas después,
     * que es la peor forma de que vuelva el mismo problema.
     */
    const available = stock.on_hand - stock.reserved;
    const missing = TARGET_STOCK - available;
    if (missing <= 0) return;

    // `receive` con su nota: el ledger tiene que poder explicarse solo, y dentro
    // de un mes alguien va a preguntar de dónde salieron estas unidades.
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO inventory_movements (product_id, type, on_hand_delta, reserved_delta, note)
        VALUES (${product.id}, 'receive', ${missing}, 0, 'Reposición automática para pruebas E2E')
      `;
      await tx`
        UPDATE inventory SET on_hand = on_hand + ${missing}, updated_at = now()
        WHERE product_id = ${product.id}
      `;
    });

    console.log(
      `[e2e] inventario repuesto: +${missing} (disponible ${available} → ${TARGET_STOCK})`,
    );
  } finally {
    await sql.end();
  }
}
