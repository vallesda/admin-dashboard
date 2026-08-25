/**
 * NextAuth type augmentation.
 *
 * Lives in its own ambient file because augmenting these modules requires them
 * to be resolved first; doing it inline in `auth.ts` fails with "Invalid module
 * name in augmentation" unless the module is imported there, and that import
 * would then be unused.
 *
 * The JWT augmentation targets `@auth/core/jwt`, not `next-auth/jwt`: the
 * latter is only a re-export (`export * from "@auth/core/jwt"`), so augmenting
 * it declares a second, unrelated interface that the callbacks never see.
 *
 * `role` is what `requireRole` reads. The password hash never appears in either
 * shape — the identity service does not return it (INV-USR-03).
 */
import type { AdminRole } from '@/db/schema/identity';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession['user'];
  }

  interface User {
    role: AdminRole;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: AdminRole;
  }
}
