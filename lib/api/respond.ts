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

  console.error('API v1 error:', error);
  return fail(500, 'internal_error', 'Algo salió mal.');
}
