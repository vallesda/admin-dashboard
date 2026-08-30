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

/**
 * The signed-in user's role, or `null` when there is no session.
 *
 * For rendering decisions only — never for authorization. Every mutation still
 * calls `requireRole`, because a hidden button is a courtesy and a Server Action
 * is a public POST endpoint. This is what lets the interface stop offering a
 * `staff` the buttons that were going to reject them, which PRODUCT.md records
 * as known debt.
 */
export async function currentRole(): Promise<Role | null> {
  const session = await auth();
  return session?.user?.role ?? null;
}

/**
 * The page-level counterpart to `requireRole`.
 *
 * `requireRole` throws, which is right for an action — a forged POST deserves
 * an exception — but wrong for a navigation: an uncaught throw in a Server
 * Component renders "A server error occurred", which is exactly the broken
 * screen this whole feature exists to replace. Typing a URL you are not
 * entitled to is not a crash; it is an answer.
 *
 * Returns the session when the role is sufficient, and `null` when it is not,
 * so the page can render a real refusal. Unauthenticated visitors never reach
 * here — the `authorized` callback redirects them to /login first — but the
 * session is still required, so `null` covers that case too.
 */
export async function pageRole(minimum: Role) {
  const session = await auth();

  if (!session?.user || !hasRole(session.user.role, minimum)) return null;

  return session;
}
