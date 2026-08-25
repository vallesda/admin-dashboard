import 'server-only';

/**
 * CLI — Customer use cases.
 *
 * Realiza: RF-CLI-001, RF-CLI-002 · HU-CLI-001.
 *
 * A Customer is a contact record, not a login (INV-CUS-02): no password, no
 * session. Whoever buys by phone exists here without ever having an account.
 */
import { eq, sql as raw } from 'drizzle-orm';

import { db } from '@/db';
import { customers, type CustomerRow } from '@/db/schema/customers';
import { NotFoundError } from '@/lib/errors';
import { normalizePhone, type CustomerInput } from './validators';

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerRow> {
  const [row] = await db
    .insert(customers)
    .values({ name: input.name, phone: input.phone, email: input.email })
    .returning();

  return row;
}

/**
 * Updates contact details.
 *
 * This never touches past orders: an Order copies name, phone and address at
 * creation (INV-CUS-03), so correcting a phone number today does not rewrite
 * who was called last month.
 */
export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<CustomerRow> {
  const [row] = await db
    .update(customers)
    .set({
      name: input.name,
      phone: input.phone,
      email: input.email,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  if (!row) throw new NotFoundError('el cliente', id);

  return row;
}

/**
 * Finds a customer by phone, ignoring formatting.
 *
 * Used when taking a repeat order: the same person may be stored as
 * "55 1234 5678" and typed as "(55) 1234-5678". Matching on digits only avoids
 * creating a duplicate record for someone who already exists.
 *
 * Deliberately not a unique constraint: the docs keep phone non-unique because
 * a household can share one number (INV-CUS spec note on email applies here
 * too). This is a lookup aid, not an identity rule.
 */
export async function findByPhone(
  value: string,
): Promise<CustomerRow | undefined> {
  const digits = normalizePhone(value);
  if (digits.length < 10) return undefined;

  const [row] = await db
    .select()
    .from(customers)
    .where(raw`regexp_replace(${customers.phone}, '\\D', '', 'g') = ${digits}`)
    .limit(1);

  return row;
}
