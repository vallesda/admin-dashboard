/**
 * El catálogo real de la pescadería: `pnpm catalogo:2026`.
 *
 * ## Qué es esto y por qué no es una migración
 *
 * Las migraciones cambian la *forma* de la base y tienen que correr en todos
 * los entornos, siempre, en orden. Esto es **contenido**: los productos que el
 * mostrador vende hoy. Un entorno de pruebas no los quiere y el día que
 * cambien los precios nadie va a escribir la migración `0021_precios_marzo`.
 *
 * ## El vínculo con el sistema de inventario
 *
 * Cada fila viene del programa con el que la pescadería cataloga su mercancía.
 * De ahí se conservan dos cosas **literales**: `clave` —su identificador, que
 * es lo que permite cruzar existencias y precios entre los dos sistemas— y
 * `nombreEnTienda`, el nombre tal cual aparece allí, con sus abreviaturas
 * («Fresh Filete Salmon Kg»). Lo demás es nuestro: el `sku`, el nombre que lee
 * el cliente y el identificador interno.
 *
 * ## Idempotente
 *
 * Se reconcilia por `clave`, no se inserta a ciegas: volver a correrlo
 * actualiza precio, nombre y categorías en vez de duplicar el catálogo. Es lo
 * que lo hace utilizable cuando el mostrador mande la lista otra vez.
 */
import postgres from 'postgres';

import {
  ABASTO,
  CATEGORIAS,
  DE_PRUEBA,
  PRODUCTOS,
  type Fila,
} from './catalogo-2026.data.ts';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });


/**
 * `cantidad` + `unidad` → cómo se vende y cuánto pesa.
 *
 * `kg` y `docena` son unidades de venta: el precio es por kilo o por docena, y
 * el peso neto sólo describe el envase. `gr` no es una unidad de venta —nadie
 * compra «un gramo»— así que se traduce a un paquete de ese peso, que es lo
 * que el cliente se lleva.
 */
function comoSeVende(fila: Fila): {
  unitType: 'kg' | 'dozen' | 'pack';
  netWeightGrams: number | null;
} {
  if (fila.unidad === 'kg') {
    return { unitType: 'kg', netWeightGrams: Math.round(fila.cantidad * 1000) };
  }
  if (fila.unidad === 'docena') {
    // Sin peso: una docena de ostiones no tiene un peso fijo, y escribir uno
    // sería inventar una precisión que el mostrador no promete.
    return { unitType: 'dozen', netWeightGrams: null };
  }
  return { unitType: 'pack', netWeightGrams: Math.round(fila.cantidad) };
}

/** `Filete Salmon` → `filete-salmon`. Sin acentos, que van a la URL. */
function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL no está definida. Corre con `pnpm catalogo:2026`.');
  }

  await sql.begin(async (tx) => {
    // ---- Categorías -----------------------------------------------------
    const idPorNombre = new Map<string, string>();

    for (const c of CATEGORIAS) {
      const [row] = await tx`
        INSERT INTO categories (name, slug, sort_order, active, show_in_nav)
        VALUES (${c.nombre}, ${c.slug}, ${c.orden}, true, ${c.enNav})
        ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name,
              sort_order = EXCLUDED.sort_order,
              active = true,
              show_in_nav = EXCLUDED.show_in_nav,
              updated_at = now()
        RETURNING id
      `;
      idPorNombre.set(c.nombre, row.id);
    }
    console.log(`categorías: ${CATEGORIAS.length} listas`);

    // ---- Productos ------------------------------------------------------
    for (const fila of PRODUCTOS) {
      const { unitType, netWeightGrams } = comoSeVende(fila);
      const abasto =
        fila.categorias.map((c) => ABASTO[c]).find(Boolean) ?? 'fresh';

      const [producto] = await tx`
        INSERT INTO products (
          sku, name, slug, price_cents, unit_type, net_weight_grams,
          supply_type, status, image_url, external_key, external_name
        ) VALUES (
          ${fila.sku},
          ${fila.nombre},
          ${slugify(fila.nombre)},
          ${Math.round(fila.precio * 100)},
          ${unitType}::unit_type,
          ${netWeightGrams},
          ${abasto}::supply_type,
          'active',
          NULL,
          ${fila.clave},
          ${fila.nombreEnTienda}
        )
        ON CONFLICT (external_key) DO UPDATE
          SET sku = EXCLUDED.sku,
              name = EXCLUDED.name,
              price_cents = EXCLUDED.price_cents,
              unit_type = EXCLUDED.unit_type,
              net_weight_grams = EXCLUDED.net_weight_grams,
              supply_type = EXCLUDED.supply_type,
              external_name = EXCLUDED.external_name,
              updated_at = now()
        RETURNING id
      `;

      /*
       * `image_url` se escribe en el INSERT y **no** en el UPDATE, y de hecho
       * entra nula: la foto no la decide esta lista.
       *
       * La suben `catalogo:fotos` o el selector de imágenes del admin, y las
       * dos guardan una URL absoluta de Blob. Si este sembrador la reescribiera
       * al reejecutarse, volver a cargar el catálogo borraría la foto que
       * alguien acabara de cambiar desde la interfaz — y nadie relacionaría una
       * cosa con la otra.
       */

      // La existencia arranca en cero y se corrige con movimientos de
      // inventario, nunca escribiendo la columna: el libro mayor es la verdad.
      // `DO NOTHING` para no pisar el conteo real al reejecutar.
      await tx`
        INSERT INTO inventory (product_id, on_hand, reserved)
        VALUES (${producto.id}, 0, 0)
        ON CONFLICT (product_id) DO NOTHING
      `;

      // Se reescribe la pertenencia entera: si la lista deja de traer una
      // categoría, el producto tiene que salir de esa estantería.
      await tx`DELETE FROM product_categories WHERE product_id = ${producto.id}`;
      for (const nombre of fila.categorias) {
        const categoryId = idPorNombre.get(nombre);
        if (!categoryId) throw new Error(`Categoría desconocida: ${nombre}`);
        await tx`
          INSERT INTO product_categories (product_id, category_id)
          VALUES (${producto.id}, ${categoryId})
          ON CONFLICT DO NOTHING
        `;
      }
    }
    console.log(`productos: ${PRODUCTOS.length} sembrados`);

    // ---- Los de prueba, fuera del escaparate ----------------------------
    //
    // Archivados, no borrados: aparecen en pedidos reales del historial y
    // `ON DELETE RESTRICT` lo impediría de todos modos — con razón. Archivar
    // los saca de la tienda y deja los pedidos viejos legibles.
    const archivados = await tx`
      UPDATE products SET status = 'archived', updated_at = now()
       WHERE sku = ANY(${DE_PRUEBA}) AND status <> 'archived'
      RETURNING sku
    `;
    console.log(
      `de prueba archivados: ${archivados.length}${
        archivados.length ? ` (${archivados.map((r) => r.sku).join(', ')})` : ''
      }`,
    );
  });

  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
