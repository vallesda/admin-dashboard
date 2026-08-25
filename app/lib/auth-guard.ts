import 'server-only';

import { auth } from '@/auth';

/**
 * Roles ordered from least to most privileged. The index doubles as the rank
 * used by `requireRole`, so adding a role means inserting it at the right spot.
 */
export const ROLES = ['staff', 'admin', 'owner'] as const;
export type Role = (typeof ROLES)[number];

export class AuthorizationError extends Error {
  constructor(message = 'Not authorized.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Asserts that a session exists and returns it.
 *
 * The `authorized` callback in auth.config.ts guards *pages*, but Server Actions
 * are POST endpoints that can be invoked directly with a forged request — they
 * never pass through that callback. Every mutation must therefore check here
 * too. This is defence in depth, not redundancy.
 */
export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    throw new AuthorizationError('You must be signed in to do that.');
  }

  return session;
}

/**
 * Asserts a session whose role is at least `minimum`.
 *
 * Until the `role` column lands (Phase 3) every authenticated user is treated as
 * `owner`, so this is currently equivalent to `requireSession`. Wiring call
 * sites up front means enabling real RBAC is a one-line change here rather than
 * an audit of every action.
 */
export async function requireRole(minimum: Role) {
  const session = await requireSession();

  const role = ((session.user as { role?: Role }).role ?? 'owner') as Role;

  if (ROLES.indexOf(role) < ROLES.indexOf(minimum)) {
    throw new AuthorizationError(
      `This action requires the ${minimum} role or higher.`,
    );
  }

  return session;
}
