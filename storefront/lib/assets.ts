import 'server-only';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Si un archivo de `public/` existe de verdad.
 *
 * ## Por qué hace falta
 *
 * Un `<Image src="/brand/logo.png">` apuntando a un archivo que no está no
 * falla ruidosamente: devuelve 404 y deja el hueco de una imagen rota. Y como
 * el logotipo aparece en la barra y en el pie, **un solo archivo ausente rompe
 * la vista de todas las páginas del sitio**.
 *
 * Eso ya pasó aquí: se cableó el código a los archivos del brandbook antes de
 * que estuvieran en el repositorio, y el sitio entero se quedó con el logotipo
 * roto. El error no fue el nombre del archivo, fue asumir que estaría.
 *
 * ## Qué permite
 *
 * Que cada componente decida qué hacer sin el archivo: el logotipo cae a
 * tipografía, el ojo a su versión en SVG, una ilustración simplemente no se
 * dibuja. Y cuando alguien suelta el archivo en `public/`, aparece **sin tocar
 * código**.
 *
 * ## El coste, y por qué la caché sólo vive en producción
 *
 * Una llamada síncrona al sistema de archivos por comprobación. En producción
 * se memoiza: el conjunto de archivos de `public/` está fijado en el momento
 * del build y no puede cambiar.
 *
 * En desarrollo **no**, y eso costó una confusión: la primera versión cacheaba
 * siempre, así que memoizaba «no existe» y seguía diciéndolo después de que
 * alguien dejara el archivo en su sitio. El logotipo seguía saliendo como
 * texto con el PNG respondiendo 200, y no había forma de verlo salvo
 * reiniciando el servidor.
 *
 * Soltar un archivo en `public/` es justamente la operación que este helper
 * existe para acompañar. Una caché que la ignora convierte la ayuda en trampa.
 */
const cache = new Map<string, boolean>();
const shouldCache = process.env.NODE_ENV === 'production';

export function hasAsset(publicPath: string): boolean {
  const cached = shouldCache ? cache.get(publicPath) : undefined;
  if (cached !== undefined) return cached;

  // `publicPath` viene siempre de una constante del propio código, nunca de
  // entrada de usuario; aun así se ancla a `public/` para que un `..` no pueda
  // convertir esto en una sonda del sistema de archivos.
  const clean = publicPath.replace(/^\/+/, '').replace(/\.\./g, '');
  const exists = existsSync(join(process.cwd(), 'public', clean));

  if (shouldCache) cache.set(publicPath, exists);
  return exists;
}

/** El primero de la lista que exista, o `null` si no existe ninguno. */
export function firstAsset(...candidates: string[]): string | null {
  return candidates.find(hasAsset) ?? null;
}
