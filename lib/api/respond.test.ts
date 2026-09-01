import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { handleError } from './respond';
import { ServiceAuthError } from './service-auth';

/**
 * Cómo se traduce un error a una respuesta.
 *
 * Lo que se prueba aquí no es cosmético: durante un despliegue, un admin sin
 * `POSTGRES_URL` devolvía un 500 idéntico al de cualquier bug de código, y esa
 * ambigüedad costó varias rondas de diagnóstico. La forma exacta del error que
 * se comprueba abajo —un `AggregateError` con `code: 'ECONNREFUSED'` y
 * `message` vacío— es la que produce `postgres(undefined)` en la práctica, no
 * una inventada para el test.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const body = async (response: Response) =>
  (await response.json()) as { error?: { code: string }; data?: unknown };

describe('handleError', () => {
  it('devuelve 401 para una credencial de servicio inválida', async () => {
    const response = handleError(new ServiceAuthError());

    expect(response.status).toBe(401);
    expect((await body(response)).error?.code).toBe('unauthorized');
  });

  it('marca la base inalcanzable como 503, no como un bug', async () => {
    /*
     * Ésta es la forma que llega de verdad desde un route handler, copiada de
     * un error real y no inventada: Drizzle envuelve el fallo en `Failed
     * query`, `postgres` agrupa los intentos en un `AggregateError`, y el
     * código de red queda dos niveles abajo. La primera versión de este test
     * usaba el error crudo del driver —que sólo se ve llamando a `postgres`
     * directamente— así que pasaba en verde mientras producción devolvía 500.
     */
    const inner = new AggregateError([], '');
    (inner as { code?: string }).code = 'ECONNREFUSED';
    const error = new Error('Failed query: select "categories"."id" from …', {
      cause: inner,
    });

    const response = handleError(error);

    expect(response.status).toBe(503);
    expect((await body(response)).error?.code).toBe('database_unavailable');
  });

  it('no se cuelga con una cadena de `cause` cíclica', async () => {
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    (a as { cause?: unknown }).cause = b;

    expect(handleError(a).status).toBe(500);
  });

  it('mira dentro del AggregateError cuando el host resuelve a varias IPs', async () => {
    const inner = new Error('connect ENOTFOUND db.example');
    (inner as { code?: string }).code = 'ENOTFOUND';

    const response = handleError(new AggregateError([inner], ''));

    expect(response.status).toBe(503);
  });

  it('deja en 500 un error de SQL: la base contestó, así que no es de red', async () => {
    // 42P01 = relación inexistente. Una migración sin correr no es un corte.
    const error = new Error('relation "products" does not exist');
    (error as { code?: string }).code = '42P01';

    const response = handleError(error);

    expect(response.status).toBe(500);
    expect((await body(response)).error?.code).toBe('internal_error');
  });
});
