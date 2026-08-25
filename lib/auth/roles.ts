/**
 * Role policy — pure, no session, no database, no `server-only`.
 *
 * Kept separate from `guard.ts` so it can be imported anywhere: by the guard on
 * the server, by a component deciding whether to render a button, and by tests
 * without dragging in NextAuth and `next/server`.
 */
import type { AdminRole } from '@/db/schema/identity';

export type Role = AdminRole;

/** Least to most privileged. The index is the rank. */
export const ROLES: readonly Role[] = ['staff', 'admin', 'owner'];

/**
 * Whether `role` satisfies a requirement of at least `minimum`.
 *
 * Fails closed: a missing role, or a string that is not a known role, is never
 * treated as privileged.
 */
export function hasRole(role: Role | undefined | null, minimum: Role): boolean {
  if (role === undefined || role === null) return false;

  const held = ROLES.indexOf(role);
  const needed = ROLES.indexOf(minimum);

  if (held === -1 || needed === -1) return false;

  return held >= needed;
}
