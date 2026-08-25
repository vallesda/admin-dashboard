/**
 * IAM — Identity & Access bounded context.
 *
 * E-AdminUser. Replaces the tutorial's `users` table as the source of truth for
 * administrative identity (DOCS/MODELO-DATOS.md §11). `users` itself stays on
 * disk until Sales retires the legacy tables; nothing reads it after this.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/** Least to most privileged. The order is the rank used to compare roles. */
export const adminRoleEnum = pgEnum('admin_role', ['staff', 'admin', 'owner']);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: text('email').notNull().unique(),
    // Named `password_hash`, not `password`: the column name should make it
    // obvious that a plaintext write is a bug (INV-USR-03).
    passwordHash: text('password_hash').notNull(),
    role: adminRoleEnum('role').notNull().default('staff'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('admin_users_role_idx').on(table.role)],
);

export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AdminRole = (typeof adminRoleEnum.enumValues)[number];
