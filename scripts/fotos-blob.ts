/**
 * Sube las fotos del catálogo a Blob: `pnpm catalogo:fotos`.
 *
 * ## Por qué no bastaba con dejarlas en `public/`
 *
 * `products.image_url` lo leen **dos** aplicaciones. Una ruta como
 * `/images/products/almeja-chione.png` sólo la resuelve quien tenga ese archivo
 * en su `public/`, y el archivo estaba únicamente en el de la tienda: en el
 * admin las trece fotos daban 404 y la lista de productos salía rota.
 *
 * Copiarlas también al admin habría duplicado 21 MB para arreglar el síntoma, y
 * habría dejado el problema de fondo intacto:
 *
 * - El selector de imágenes del admin sube a Blob y guarda URL absoluta. Con
 *   rutas locales, cambiar una foto desde la interfaz la convertía en absoluta
 *   y el catálogo acababa con dos convenciones conviviendo.
 * - La tienda va a ser un sistema aparte que consume la API. Una ruta relativa
 *   obliga a que ese sistema hospede copias de las fotos; una URL absoluta la
 *   sirve cualquiera.
 *
 * ## Idempotente
 *
 * Salta el producto cuya foto ya vive en Blob. Volver a correrlo no duplica
 * archivos ni gasta ancho de banda; `--forzar` sube de nuevo y borra la
 * anterior.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { put, del } from '@vercel/blob';
import postgres from 'postgres';

import { PRODUCTOS } from './catalogo-2026.data.ts';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/** Donde están los archivos que se van a subir. */
const ORIGEN = 'storefront/public/images/products';

const forzar = process.argv.includes('--forzar');

const esBlob = (url: string | null) =>
  url !== null && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(url);

async function main() {
  if (!process.env.POSTGRES_URL) throw new Error('Falta POSTGRES_URL.');
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Falta BLOB_READ_WRITE_TOKEN. Corre `pnpm blob:check`.');
  }

  let subidas = 0;
  let saltadas = 0;

  for (const producto of PRODUCTOS) {
    const [fila] = await sql`
      SELECT id, image_url FROM products WHERE external_key = ${producto.clave}
    `;

    if (!fila) {
      console.log(`· ${producto.nombre}: no está en la base, se salta`);
      continue;
    }

    if (esBlob(fila.image_url) && !forzar) {
      saltadas++;
      continue;
    }

    const ruta = join(ORIGEN, producto.imagen);
    if (!existsSync(ruta)) {
      console.log(`· ${producto.nombre}: falta ${producto.imagen}`);
      continue;
    }

    const { url } = await put(`products/${producto.imagen}`, await readFile(ruta), {
      access: 'public',
      contentType: 'image/png',
      // Blob añade un sufijo aleatorio, así que dos productos con el mismo
      // nombre de archivo no se pisan. Es también lo que hace que la URL
      // cambie al reemplazar una foto, y por tanto que las cachés se enteren.
      addRandomSuffix: true,
    });

    const anterior = fila.image_url;
    await sql`
      UPDATE products SET image_url = ${url}, updated_at = now() WHERE id = ${fila.id}
    `;

    // Después de que la fila esté escrita, nunca antes: perder el archivo
    // viejo mientras el UPDATE falla dejaría al producto apuntando a nada.
    if (esBlob(anterior) && anterior !== url) {
      await del(anterior).catch((e: unknown) => {
        console.log(`  (no se pudo borrar la anterior: ${String(e)})`);
      });
    }

    subidas++;
    console.log(`✓ ${producto.nombre.padEnd(26)} ${producto.imagen}`);
  }

  console.log(`\nsubidas: ${subidas}   ya estaban: ${saltadas}`);
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
