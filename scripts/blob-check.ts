/**
 * Blob store diagnostic: `pnpm blob:check`.
 *
 * Answers the one question the SDK's errors do not: is this store usable for
 * product images? It uploads a 1x1 PNG, fetches it back without credentials,
 * and deletes it.
 *
 * Exists because the failure mode is confusing — a store created in private
 * mode rejects public uploads with a message about "access", which reads like a
 * code bug rather than a store setting.
 */
import { put, del } from '@vercel/blob';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('✗ Falta BLOB_READ_WRITE_TOKEN en .env');
    console.error('  Crea el store en Vercel → Storage y trae la variable.');
    process.exitCode = 1;
    return;
  }

  console.log('✓ Token presente');

  let url: string;

  try {
    const blob = await put('products/_diagnostic.png', PIXEL, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: true,
    });
    url = blob.url;
    console.log('✓ Subida pública aceptada');
    console.log(`  ${new URL(url).hostname}`);
  } catch (error) {
    const message = (error as Error).message ?? '';

    if (message.includes('private store')) {
      console.error('✗ El store está en modo PRIVADO');
      console.error('  Las imágenes de producto tienen que servirse públicamente.');
      console.error('  Cámbialo en Vercel → Storage → tu store → Settings → access: public');
    } else {
      console.error('✗ Falló la subida:', message);
    }

    process.exitCode = 1;
    return;
  }

  const response = await fetch(url);

  if (response.ok) {
    console.log(`✓ Legible sin credenciales (HTTP ${response.status})`);
  } else {
    console.error(`✗ No es legible públicamente (HTTP ${response.status})`);
    process.exitCode = 1;
  }

  await del(url);
  console.log('✓ Borrado — el store queda como estaba');
  console.log('\nTodo listo: el botón "Agregar imagen" ya puede subir.');
}

main().catch((error) => {
  console.error('Diagnóstico falló:', error);
  process.exitCode = 1;
});
