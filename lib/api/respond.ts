import 'server-only';

/**
 * Shared response helpers for the public API.
 *
 * Keeps error shape and cache policy in one place: a client that has to handle
 * three different error formats will end up handling none of them.
 */
import { NextResponse } from 'next/server';

import { ServiceAuthError } from './service-auth';
import { isDomainError } from '@/lib/errors';

/** Catalogue changes rarely; availability is revalidated at checkout anyway. */
export const CATALOG_CACHE = 'public, s-maxage=60, stale-while-revalidate=300';

export function ok<T>(data: T, cacheControl?: string): NextResponse {
  return NextResponse.json(
    { data },
    cacheControl ? { headers: { 'Cache-Control': cacheControl } } : undefined,
  );
}

export function fail(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Maps a thrown error to a response.
 *
 * A `DomainError` is an expected outcome the client should show the shopper —
 * "solo hay 8 disponibles" — so it keeps its code and message. Anything else is
 * a bug: it is logged and returned as a bare 500, because an internal message
 * is not something a public endpoint should narrate.
 */
export function handleError(error: unknown): NextResponse {
  if (error instanceof ServiceAuthError) {
    return fail(401, 'unauthorized', error.message);
  }

  if (isDomainError(error)) {
    return fail(422, error.code, error.message);
  }

  /*
   * Una base inalcanzable no es «algo salió mal»: es el servicio no
   * disponible, y confundir las dos cosas cuesta horas.
   *
   * `db/index.ts` hace `postgres(process.env.POSTGRES_URL!)`. Ese `!` es una
   * promesa al compilador, no una comprobación: sin la variable, la librería
   * no falla ahí — asume `localhost` y revienta después, al consultar, con un
   * `ECONNREFUSED` cuyo `message` viene vacío. El resultado era un 500
   * genérico e idéntico al de cualquier bug, sobre un despliegue al que sólo
   * le faltaba una variable de entorno.
   *
   * El 503 lo dice: el problema es de infraestructura y reintentar tiene
   * sentido. El nombre de la variable en el log es lo que convierte una
   * cacería en una lectura.
   */
  if (isDatabaseUnreachable(error)) {
    /*
     * El diagnóstico va en el log, nunca en la respuesta.
     *
     * Se informa de si la variable **tiene valor**, no de cuál es: una cadena
     * de conexión lleva la contraseña dentro. Y se comprueba que no esté
     * vacía, no que exista: una variable declarada sin valor vale `''`, que es
     * falsa para `postgres()` —asume `127.0.0.1:5432`— pero aparece
     * perfectamente listada en el panel de Vercel. Distinguir «no está» de
     * «está vacía» de «apunta a otro sitio» es lo que convierte esta línea en
     * la respuesta en vez de en otra pista.
     */
    const url = process.env.POSTGRES_URL?.trim();
    console.error(
      `API v1: no se pudo conectar a la base de datos. POSTGRES_URL ${
        url
          ? `apunta a ${hostOf(url)}`
          : 'está vacía o ausente en este despliegue, así que la conexión se ' +
            'intentó contra localhost'
      }.`,
      error,
    );
    return fail(503, 'database_unavailable', 'Servicio no disponible.');
  }

  console.error('API v1 error:', error);
  return fail(500, 'internal_error', 'Algo salió mal.');
}

/** El host de una cadena de conexión, sin credenciales. Para el log. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '(no es una URL válida)';
  }
}

/**
 * Distingue «no se pudo llegar a la base» de «la base contestó un error».
 *
 * Sólo fallos de red y de resolución de nombres. Un error de SQL —una tabla
 * que falta porque no se migró, una credencial rechazada— llega con un código
 * de PostgreSQL y no entra aquí: eso sí es un 500, porque la base contestó.
 *
 * Hay que recorrer **dos** anidamientos, y saltarse cualquiera de los dos hace
 * que esto no detecte nada:
 *
 * - `cause`: Drizzle envuelve el fallo en un `Error: Failed query: select …` y
 *   deja el original debajo. Ésta es la forma que llega de verdad desde un
 *   route handler; el error crudo de `postgres` sólo se ve llamando al driver
 *   a pelo, que es como se escribió la primera versión de esta función — pasaba
 *   sus pruebas y no reconocía ni un caso en producción.
 * - `errors[]`: `postgres` agrupa los intentos en un `AggregateError` cuando el
 *   host resuelve a varias direcciones.
 *
 * El límite de profundidad no es paranoia gratuita: `cause` es un campo que
 * cualquiera puede rellenar, y una cadena cíclica colgaría la petición que
 * intenta explicar por qué falló.
 */
function isDatabaseUnreachable(error: unknown, depth = 0): boolean {
  if (depth > 5 || error === null || typeof error !== 'object') return false;

  const NETWORK = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'];

  const { code, errors, cause } = error as {
    code?: unknown;
    errors?: unknown;
    cause?: unknown;
  };

  if (typeof code === 'string' && NETWORK.includes(code)) return true;

  if (
    Array.isArray(errors) &&
    errors.some((e) => isDatabaseUnreachable(e, depth + 1))
  ) {
    return true;
  }

  return cause !== undefined && isDatabaseUnreachable(cause, depth + 1);
}

