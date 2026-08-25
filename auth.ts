import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from './auth.config';
import { credentialsSchema } from '@/modules/identity/validators';
import {
  verifyCredentials,
  getSessionUserById,
} from '@/modules/identity/service';

// Session/JWT shapes are augmented in types/next-auth.d.ts.

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Copies id and role into the token at sign-in.
     *
     * On later requests the role is re-read from the database rather than
     * trusted from the token: a JWT issued before a demotion would otherwise
     * keep its old privileges until it expired, and revoking access has to take
     * effect on the next request. It also drops the session when a user is
     * deactivated (INV-USR-02).
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        return token;
      }

      if (token.id) {
        const current = await getSessionUserById(token.id);
        if (!current) return null;
        token.role = current.role;
        token.name = current.name;
        token.email = current.email;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        return await verifyCredentials(email, password);
      },
    }),
  ],
});
