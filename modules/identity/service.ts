import 'server-only';

/**
 * IAM — Identity & Access use cases.
 *
 * Realiza: RF-IAM-001, RF-IAM-002 · HU-IAM-001.
 */
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { db } from '@/db';
import { adminUsers, type AdminRole } from '@/db/schema/identity';

/**
 * What a session is allowed to carry.
 *
 * Deliberately does NOT include `passwordHash` (INV-USR-03). Returning the row
 * type here would let the hash reach the JWT the moment someone spreads the
 * object, which is exactly how the tutorial leaked it.
 */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

/**
 * Verifies email + password and returns the session payload, or null.
 *
 * Returns null for every failure — unknown email, wrong password, inactive
 * account — so the caller cannot distinguish them and neither can an attacker
 * probing for valid addresses.
 *
 * An inactive user is rejected even with the right password (INV-USR-02).
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const [user] = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
      passwordHash: adminUsers.passwordHash,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (!user) {
    // Compare against a dummy hash anyway so a missing account takes about as
    // long as a wrong password; otherwise response time reveals which emails
    // exist.
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordsMatch) return null;

  if (!user.active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

/** A valid bcrypt hash of a value nobody uses, for constant-ish timing. */
const DUMMY_HASH =
  '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTU';

/** Reads a user's current role and active flag — never the hash. */
export async function getSessionUserById(
  id: string,
): Promise<SessionUser | null> {
  const [user] = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!user || !user.active) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
