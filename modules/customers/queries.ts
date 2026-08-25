import 'server-only';

/**
 * CLI — read models.
 */
import { asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { customers, type CustomerRow } from '@/db/schema/customers';

export const CUSTOMERS_PER_PAGE = 10;

export type CustomerListItem = Pick<
  CustomerRow,
  'id' | 'name' | 'phone' | 'email' | 'createdAt'
>;

/**
 * Search by name, phone or email (RF-CLI-004).
 *
 * The phone branch strips formatting from both sides, so searching "5512345678"
 * finds a customer stored as "55 1234 5678".
 */
function customerSearch(query: string): SQL | undefined {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;

  const pattern = `%${trimmed}%`;
  const digits = trimmed.replace(/\D/g, '');

  const clauses = [
    ilike(customers.name, pattern),
    ilike(customers.email, pattern),
  ];

  if (digits.length >= 3) {
    clauses.push(
      sql`regexp_replace(${customers.phone}, '\\D', '', 'g') LIKE ${`%${digits}%`}`,
    );
  } else {
    clauses.push(ilike(customers.phone, pattern));
  }

  return or(...clauses);
}

export async function listCustomers(
  query: string,
  page: number,
): Promise<{
  items: CustomerListItem[];
  total: number;
  totalPages: number;
}> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const offset = (safePage - 1) * CUSTOMERS_PER_PAGE;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(customers)
    .where(customerSearch(query))
    .orderBy(asc(customers.name))
    .limit(CUSTOMERS_PER_PAGE)
    .offset(offset);

  const total = rows[0]?.total ?? 0;

  return {
    items: rows.map(({ total: _total, ...row }) => row),
    total,
    totalPages: Math.ceil(total / CUSTOMERS_PER_PAGE),
  };
}

export async function getCustomerById(
  id: string,
): Promise<CustomerRow | undefined> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  return row;
}

/** Options for the order form's customer picker. Most recent first. */
export async function listRecentCustomers(
  limit = 50,
): Promise<Pick<CustomerRow, 'id' | 'name' | 'phone'>[]> {
  return db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .orderBy(desc(customers.createdAt))
    .limit(limit);
}
