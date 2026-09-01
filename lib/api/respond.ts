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
    console.error(
      'API v1: base de datos inalcanzable. Revisa POSTGRES_URL en el entorno ' +
        'de este despliegue; sin ella la conexión se intenta contra localhost.',
      error,
    );
    return fail(503, 'database_unavailable', 'Servicio no disponible.');
  }

  console.error('API v1 error:', error);
  return fail(500, 'internal_error', 'Algo salió mal.');
}

/**
 * Distingue «no se pudo llegar a la base» de «la base contestó un error».
 *
 * Sólo fallos de red y de resolución de nombres. Un error de SQL —una tabla
 * que falta porque no se migró, una credencial rechazada— llega con un código
 * de PostgreSQL y no entra aquí: eso sí es un 500, porque la base contestó.
 *
 * `postgres` agrupa los intentos en un `AggregateError` cuando el host
 * resuelve a varias direcciones, así que hay que mirar también dentro.
 */
function isDatabaseUnreachable(error: unknown): boolean {
  const NETWORK = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'];

  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && NETWORK.includes(code)) return true;

  const nested = (error as { errors?: unknown } | null)?.errors;
  return (
    Array.isArray(nested) &&
    nested.some((e) => {
      const c = (e as { code?: unknown } | null)?.code;
      return typeof c === 'string' && NETWORK.includes(c);
    })
  );
}
