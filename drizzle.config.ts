import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
    ssl: 'require',
  },
  // Keep generated SQL readable in review.
  verbose: true,
  strict: true,
} satisfies Config;
