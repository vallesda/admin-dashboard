/**
 * The four tables inherited from the Next.js Learn tutorial.
 *
 * These are modelled exactly as they exist in the database today so that the
 * first migration is a faithful baseline rather than a rewrite. The constraints
 * the tutorial omitted (foreign key, status CHECK, revenue primary key, the
 * indexes the queries need) are added in migration 0001 and are declared here.
 *
 * `invoices` is DEPRECATED: it is superseded by the `orders` domain in Phase 2
 * and removed once that ships. It stays for now because it is the only working
 * proof of the CRUD, search and pagination flow.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  index,
  check,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// `customers` now lives in its own bounded context (CLI); `invoices` still
// references it until F4 retires the tutorial tables.
import { customers } from './customers';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
});

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      // The tutorial shipped no foreign key at all, so nothing stopped orphan
      // invoices. RESTRICT rather than CASCADE: deleting a customer who has
      // invoices should be a deliberate act, not a silent cascade.
      .references(() => customers.id, { onDelete: 'restrict' }),
    amount: integer('amount').notNull(),
    status: varchar('status', { length: 255 }).notNull(),
    date: date('date').notNull(),
  },
  (table) => [
    index('invoices_customer_id_idx').on(table.customerId),
    // Matches `ORDER BY invoices.date DESC` in fetchFilteredInvoices; `id` is
    // the tiebreaker the tutorial lacked (DATE is day-granular, so same-day
    // invoices sorted non-deterministically) and the key for Phase 4's keyset
    // pagination.
    index('invoices_date_id_idx').on(sql`${table.date} DESC`, table.id),
    index('invoices_status_idx').on(table.status),
    // The app treats status as an enum but the column is varchar(255), which
    // accepts any string. A CHECK is the cheapest fix that needs no data
    // migration; it becomes a real pg enum with the orders domain.
    check('invoices_status_check', sql`${table.status} IN ('pending', 'paid')`),
  ],
);

export const revenue = pgTable(
  'revenue',
  {
    month: varchar('month', { length: 4 }).notNull(),
    revenue: integer('revenue').notNull(),
  },
  (table) => [
    // The table had only a UNIQUE constraint and no primary key.
    primaryKey({ columns: [table.month] }),
  ],
);
