import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import { sql } from '@/db';

async function getUser(email: string): Promise<User | undefined> {
  try {
    // Select explicitly rather than `SELECT *` — the row is handed to NextAuth
    // below, and `*` would carry the bcrypt hash into the session object.
    const user = await sql<User[]>`
      SELECT id, name, email, password FROM users WHERE email = ${email}
    `;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
 
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          // Strip the hash before it reaches the JWT / session payload.
          if (passwordsMatch) {
            return { id: user.id, name: user.name, email: user.email };
          }
        }
 
        return null;
      },
    }),
  ],
});