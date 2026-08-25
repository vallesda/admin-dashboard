import 'server-only';

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Single connection pool for the whole app.
//
// Next's dev server re-evaluates modules on every hot reload, which would leak a
// new pool each time. Stashing the client on globalThis keeps exactly one pool
// alive across reloads. In production the module is evaluated once, so the
// global is never read.
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

export const sql =
  globalForDb.sql ??
  postgres(process.env.POSTGRES_URL!, {
    ssl: 'require',
    // Neon pools connections itself; keep our own footprint small so several
    // serverless instances can coexist within the connection budget.
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql;
}

export const db = drizzle(sql);
