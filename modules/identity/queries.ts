import 'server-only';

/**
 * IAM — read models for the admin's user screens.
 *
 * Every projection here omits `passwordHash` by naming its columns explicitly.
 * A `select()` with no argument would carry the hash into whatever renders the
 * row, which is precisely how the tutorial leaked it (INV-USR-03).
 */
import { asc, eq, and, ne, count } from 'drizzle-orm';

import { db } from '@/db';
import { adminUsers, type AdminRole } from '@/db/schema/identity';

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: Date;
};

/** Everyone with access, most privileged first. */
export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  return db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.name));
}

export async function getAdminUserById(
  id: string,
): Promise<AdminUserListItem | undefined> {
  const [row] = await db
    .select({
      id: adminUsers.id,
      name: adminUsers.name,
      email: adminUsers.email,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return row;
}

/**
 * How many active owners exist besides `exceptId`.
 *
 * The number that stops the shop locking itself out. Demoting or deactivating
 * the last active owner leaves nobody who can create users, change roles or
 * restore access — and the only way back would be a hand-written SQL statement
 * against production.
 */
export async function countOtherActiveOwners(exceptId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(adminUsers)
    .where(
      and(
        eq(adminUsers.role, 'owner'),
        eq(adminUsers.active, true),
        ne(adminUsers.id, exceptId),
      ),
    );

  return row?.total ?? 0;
}
