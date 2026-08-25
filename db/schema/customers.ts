/**
 * CLI — Customers bounded context.
 *
 * E-Customer. This is the tutorial's `customers` table, promoted to a real
 * domain entity (DOCS/MODELO-DATOS.md §11, paso 3). It was ALTERed rather than
 * recreated, so the ids survived — which mattered, because a real order already
 * references one of the customers the tutorial created.
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    // Required: for pickup or delivery, the phone is how the shop reaches the
    // buyer. Email is not (INV-CUS-01).
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('customers_name_idx').on(table.name),
    index('customers_phone_idx').on(table.phone),
    index('customers_email_idx').on(table.email),
  ],
);

export type CustomerRow = typeof customers.$inferSelect;
