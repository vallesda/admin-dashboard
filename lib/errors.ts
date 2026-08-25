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

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { code?: string; constraint_name?: string };
  if (e.code !== PG_UNIQUE_VIOLATION) return false;
  return constraint ? e.constraint_name === constraint : true;
}
