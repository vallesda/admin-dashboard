'use client';

import { createContext, useContext } from 'react';

import { hasRole, type Role } from '@/lib/auth/roles';

/**
 * The session's role, for components that decide what to render.
 *
 * **This is not authorization.** Every mutation still calls `requireRole` on the
 * server, because a Server Action is a public POST endpoint and a hidden button
 * stops nobody. What this fixes is the interface lying: until now a `staff` saw
 * "Archivar" and "Marcar pagado" and got an error when they pressed them, which
 * PRODUCT.md carries as known debt. Offering an action that is going to be
 * refused is worse than not offering it.
 *
 * The role is read once by the dashboard layout — a Server Component with the
 * session already in hand — and handed down. Components do not fetch it, so
 * there is no request per button.
 */
const RoleContext = createContext<Role | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  role: Role | null;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** The current role, or `null` outside a session. */
export function useRole(): Role | null {
  return useContext(RoleContext);
}

/** Whether the session satisfies a minimum rank. Fails closed. */
export function useCan(minimum: Role): boolean {
  return hasRole(useContext(RoleContext), minimum);
}

/**
 * Renders its children only when the session ranks at or above `role`.
 *
 * `fallback` exists for the handful of places where the absence needs to be
 * explained rather than silent — a list screen whose primary action disappears
 * looks broken otherwise.
 */
export function Can({
  role,
  fallback = null,
  children,
}: {
  role: Role;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <>{useCan(role) ? children : fallback}</>;
}
