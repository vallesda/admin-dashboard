/**
 * One-time reconciliation of the pre-existing database with migration 0000.
 *
 * The tutorial created its tables from a route handler, so the database already
 * holds `users`, `customers`, `invoices` and `revenue` — but without the foreign
 * key, indexes, CHECK and primary key that the Drizzle schema declares. Running
 * `db:migrate` against it would fail on `CREATE TABLE ... already exists`.
 *
 * So: apply only the missing constraints, then record 0000 in Drizzle's journal
 * so subsequent migrations (0001+) run normally. A fresh database never needs
 * this script — it just runs `db:migrate` and gets 0000 in full.
 *
 * Safe to re-run: every statement is guarded.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const MIGRATION_TAG = '0000_pale_black_crow';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function reconcile() {
  // Foreign key: invoices.customer_id -> customers.id
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'invoices_customer_id_customers_id_fk'
      ) THEN
        ALTER TABLE invoices
          ADD CONSTRAINT invoices_customer_id_customers_id_fk
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `;

  // CHECK: status is really an enum of two values.
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check'
      ) THEN
        ALTER TABLE invoices
          ADD CONSTRAINT invoices_status_check
          CHECK (status IN ('pending', 'paid'));
      END IF;
    END $$;
  `;

  // revenue had a UNIQUE on month but no primary key.
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'revenue'::regclass AND contype = 'p'
      ) THEN
        ALTER TABLE revenue ADD CONSTRAINT revenue_month_pk PRIMARY KEY (month);
      END IF;
    END $$;
  `;

  // Indexes the existing queries in app/lib/data.ts need.
  await sql`CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (name)`;
  await sql`CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email)`;
  await sql`CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices (customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS invoices_date_id_idx ON invoices (date DESC, id)`;
  await sql`CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status)`;

  // Trigram support for the ILIKE '%q%' search. A leading wildcard can never use
  // a btree index; without pg_trgm every search is a full scan.
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  await sql`CREATE INDEX IF NOT EXISTS customers_name_trgm_idx ON customers USING gin (name gin_trgm_ops)`;
  await sql`CREATE INDEX IF NOT EXISTS customers_email_trgm_idx ON customers USING gin (email gin_trgm_ops)`;

  // The planner has no statistics for these tables (reltuples = -1).
  await sql`ANALYZE users, customers, invoices, revenue`;
}

async function baseline() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const file = path.join(
    process.cwd(),
    'db/migrations',
    `${MIGRATION_TAG}.sql`,
  );
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(file, 'utf8'))
    .digest('hex');

  const [existing] = await sql`
    SELECT id FROM drizzle."__drizzle_migrations" WHERE hash = ${hash}
  `;

  if (existing) {
    console.log(`  ${MIGRATION_TAG}: already baselined`);
    return;
  }

  const journal = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'db/migrations/meta/_journal.json'),
      'utf8',
    ),
  );
  const when = journal.entries.find(
    (e: { tag: string; when: number }) => e.tag === MIGRATION_TAG,
  ).when;

  await sql`
    INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
    VALUES (${hash}, ${when})
  `;
  console.log(`  ${MIGRATION_TAG}: recorded as applied`);
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set.');
  }

  console.log('Reconciling existing database with migration 0000...');
  await reconcile();
  await baseline();
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Baseline failed:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
