import { sql as raw } from 'drizzle-orm';

import { db } from '@/db';
import { ok, handleError } from '@/lib/api/respond';
import { requireServiceToken } from '@/lib/api/service-auth';

/**
 * GET /api/v1/health — si este despliegue puede hablar con su base.
 *
 * Existe porque diagnosticar un corte de base costó varios días de ida y
 * vuelta. La respuesta pública de los demás endpoints es muda a propósito —un
 * 503 y «Servicio no disponible»— y el detalle vivía sólo en el log del
 * servidor, que hay que ir a buscar a otra pantalla. Esto lo pone donde se
 * puede leer con `curl` desde cualquier sitio.
 *
 * Detrás del token de servicio, no público. Nada de lo que devuelve es un
 * secreto —un nombre de host no lo es— pero decirle a un desconocido qué
 * infraestructura hay detrás y si está caída es información que sólo ayuda a
 * quien busca por dónde empujar.
 *
 * **Nunca la cadena de conexión.** Lleva la contraseña dentro; se publica el
 * host y si la variable tiene valor, que es lo único que hace falta para
 * distinguir los tres fallos que se han dado de verdad: variable ausente,
 * variable vacía, y host equivocado.
 */
export async function GET(request: Request) {
  try {
    requireServiceToken(request);

    const url = process.env.POSTGRES_URL?.trim();

    // `?.trim()` y no sólo la existencia: una variable declarada sin valor
    // vale `''`, aparece listada en el panel y hace que `postgres()` asuma
    // `localhost`. Es el fallo que más tiempo costó, y desde fuera era
    // indistinguible de no tenerla.
    if (!url) {
      return ok({
        database: {
          configured: false,
          host: null,
          reachable: false,
          detail:
            'POSTGRES_URL está vacía o ausente en este despliegue. La conexión ' +
            'se intentaría contra localhost.',
        },
      });
    }

    const started = Date.now();

    try {
      await db.execute(raw`select 1`);

      return ok({
        database: {
          configured: true,
          host: hostOf(url),
          reachable: true,
          latencyMs: Date.now() - started,
        },
      });
    } catch (error) {
      return ok({
        database: {
          configured: true,
          host: hostOf(url),
          reachable: false,
          latencyMs: Date.now() - started,
          detail: describe(error),
        },
      });
    }
  } catch (error) {
    return handleError(error);
  }
}

/** El host de la cadena, sin credenciales. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '(POSTGRES_URL no es una URL válida)';
  }
}

/**
 * El código del fallo, no su mensaje.
 *
 * Un mensaje de driver puede arrastrar la cadena de conexión entera; el código
 * —`ECONNREFUSED`, `ENOTFOUND`, `28P01`— es corto, estable y dice lo mismo para
 * quien tiene que arreglarlo. Se busca en la cadena de `cause` por la misma
 * razón que en `handleError`: Drizzle envuelve el error del driver.
 */
function describe(error: unknown, depth = 0): string {
  if (depth > 5 || error === null || typeof error !== 'object') {
    return 'error desconocido';
  }

  const { code, errors, cause } = error as {
    code?: unknown;
    errors?: unknown;
    cause?: unknown;
  };

  if (typeof code === 'string') return code;

  if (Array.isArray(errors)) {
    for (const nested of errors) {
      const found = describe(nested, depth + 1);
      if (found !== 'error desconocido') return found;
    }
  }

  return cause === undefined ? 'error desconocido' : describe(cause, depth + 1);
}
