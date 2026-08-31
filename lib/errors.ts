/**
 * Shared error vocabulary.
 *
 * The point of these types is that a service can fail for a *business* reason
 * (slug already taken, category still in use) without the caller having to
 * pattern-match on Postgres error codes or on message strings. Actions map
 * these to form errors; anything else is a genuine bug and should surface as a
 * 500, not be swallowed into a friendly message.
 */

/** A rule of the domain said no. Expected, actionable, shown to the user. */
export class DomainError extends Error {
  /** Stable, greppable code — e.g. `category.slug_taken`. */
  readonly code: string;
  /** Field this error belongs to, when it maps to one form input. */
  readonly field?: string;

  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.field = field;
  }
}

/** The thing you asked for does not exist. */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('not_found', `No se encontró ${entity} (${id}).`, undefined);
    this.name = 'NotFoundError';
  }
}

/** A uniqueness constraint of the business was violated. */
export class ConflictError extends DomainError {
  constructor(code: string, message: string, field?: string) {
    super(code, message, field);
    this.name = 'ConflictError';
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/**
 * Postgres unique-violation code. Used to turn a race that slipped past a
 * pre-check into a proper ConflictError instead of a 500.
 */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * Busca el error del driver dentro de lo que Drizzle lanza.
 *
 * Drizzle envuelve los fallos de consulta en un `Error` propio —«Failed query:
 * delete from …»— y deja el original en `cause`. Mirar sólo el nivel superior
 * hacía que `isUniqueViolation` e `isForeignKeyViolation` devolvieran `false`
 * **siempre**, así que un SKU repetido o una zona en uso llegaban al operador
 * como un volcado de SQL en lugar del mensaje escrito para él.
 *
 * Lo encontró una prueba de base de datos; con la comprobación manual pasaba
 * desapercibido porque el error *sí* aparecía, sólo que ilegible.
 */
function pgErrorOf(
  error: unknown,
): { code?: string; constraint_name?: string; constraint?: string } | null {
  let current = error;

  // Tres niveles bastan de sobra; el límite es para no seguir una cadena
  // circular hasta el desbordamiento.
  for (let depth = 0; depth < 3 && current; depth++) {
    if (typeof current === 'object' && 'code' in current) {
      return current as {
        code?: string;
        constraint_name?: string;
        constraint?: string;
      };
    }
    current = (current as { cause?: unknown }).cause;
  }

  return null;
}

/**
 * El nombre de la restricción, se llame como se llame en este driver.
 *
 * `postgres.js` lo expone como `constraint_name`; PGlite, como `constraint`.
 * Leer sólo uno haría que las pruebas y la producción discreparan justo en la
 * comprobación más específica.
 */
function constraintOf(e: { constraint_name?: string; constraint?: string }) {
  return e.constraint_name ?? e.constraint;
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = pgErrorOf(error);
  if (!e || e.code !== PG_UNIQUE_VIOLATION) return false;
  return constraint ? constraintOf(e) === constraint : true;
}

/**
 * Los dos códigos que levanta una referencia que impide borrar.
 *
 * `23503` es la violación de clave foránea de toda la vida. `23001` es
 * `restrict_violation`, que es lo que levanta específicamente un
 * `ON DELETE RESTRICT` — y era el único caso que este proyecto usa.
 *
 * Comprobar sólo `23503` hacía que `isForeignKeyViolation` devolviera `false`
 * justo en el escenario para el que se escribió: borrar una zona de reparto con
 * pedidos detrás. Lo encontró una prueba de base; a mano se veía un error y
 * nadie miraba cuál.
 */
const PG_REFERENCE_VIOLATIONS = new Set(['23503', '23001']);

/**
 * Whether Postgres refused a write because something still points at the row.
 *
 * Lets a service turn `ON DELETE RESTRICT` into a sentence a person can act on,
 * without having to query for the referencing rows first — and, more usefully,
 * without having to import the module that owns them. A context can enforce
 * "you cannot delete this while it is in use" against tables it is not allowed
 * to know about.
 */
export function isForeignKeyViolation(
  error: unknown,
  constraint?: string,
): boolean {
  const e = pgErrorOf(error);
  if (!e || !e.code || !PG_REFERENCE_VIOLATIONS.has(e.code)) return false;
  return constraint ? constraintOf(e) === constraint : true;
}
