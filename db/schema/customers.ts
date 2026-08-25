/**
 * CLI — Customers bounded context.
 *
 * E-Customer. This is the tutorial's `customers` table, promoted to a real
 * domain entity (DOCS/MODELO-DATOS.md §11, paso 3). It is ALTERed rather than
 * recreated: `invoices.customer_id` still points at these ids, and dropping the
 * table would take the tutorial's data with it before F4 is ready to retire it.
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
    /**
     * Legacy column, kept only because the tutorial's invoice UI still renders
     * it. Nullable now — a fish shop's customer has no avatar — and dropped in
     * F4 with the rest of the invoice code.
     */
    imageUrl: varchar('image_url', { length: 255 }),
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
