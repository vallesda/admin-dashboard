import 'server-only';

/**
 * Authorization for Server Actions.
 *
 * Realiza: RF-IAM-003 · HU-IAM-001.
 *
 * Server Actions are POST endpoints that can be invoked directly with a forged
 * request; they do not pass through the `authorized` callback in
 * `auth.config.ts`, which only guards page navigation. Every sensitive mutation
 * must therefore check here as well. This is defence in depth, not redundancy.
 *
 * The rank policy itself lives in `roles.ts` so it stays testable and usable
 * from the client.
 */
import { auth } from '@/auth';
import { hasRole, type Role } from './roles';

export { hasRole, ROLES, type Role } from './roles';

export class AuthorizationError extends Error {
  constructor(message = 'No tienes permiso para hacer esto.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError('Inicia sesión para continuar.');
  }

  return session;
}

/**
 * Asserts a session whose role is at least `minimum`.
 *
 * There is no `?? 'owner'` fallback any more (DT-009). A session without a
 * usable role is denied: the previous behaviour made every `requireRole` call
 * in the codebase a no-op.
 */
export async function requireRole(minimum: Role) {
  const session = await requireSession();

  if (!hasRole(session.user.role, minimum)) {
    throw new AuthorizationError(
      `Esta acción requiere el rol ${minimum} o superior.`,
    );
  }

  return session;
}
