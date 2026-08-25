/**
 * Data seeding, run from the CLI: `pnpm db:seed`.
 *
 * This used to be `GET /seed`, an unauthenticated route handler that anyone on
 * the internet could hit. Seeding is a development operation, not an endpoint.
 *
 * Table creation is NOT done here any more — the schema is owned by the Drizzle
 * migrations in db/migrations. This script only inserts rows.
 */
import bcrypt from 'bcrypt';
import postgres from 'postgres';
import {
  invoices,
  customers,
  revenue,
  users,
} from '../app/lib/placeholder-data.ts';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedAdminUsers() {
  const rows = await Promise.all(
    users.map(async (user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password_hash: await bcrypt.hash(user.password, 10),
      // The seeded account is the one that bootstraps the system, so it needs
      // to be able to create the others.
      role: 'owner',
      active: true,
    })),
  );

  // One multi-row INSERT rather than one round-trip per user.
  await sql`
    INSERT INTO admin_users ${sql(rows, 'id', 'name', 'email', 'password_hash', 'role', 'active')}
    ON CONFLICT (email) DO NOTHING
  `;

  return rows.length;
}

async function seedCustomers() {
  await sql`
    INSERT INTO customers ${sql(customers, 'id', 'name', 'email', 'image_url')}
    ON CONFLICT (id) DO NOTHING
  `;

  return customers.length;
}

async function seedInvoices() {
  // The placeholder invoices carry no id, so `ON CONFLICT (id)` can never fire —
  // the original route duplicated every invoice on each run. Guard on emptiness
  // instead so re-running stays idempotent.
  const [{ count }] = await sql<{ count: string }[]>`
    SELECT COUNT(*)::int AS count FROM invoices
  `;

  if (Number(count) > 0) {
    console.log(`  invoices: skipped, table already holds ${count} row(s)`);
    return 0;
  }

  await sql`
    INSERT INTO invoices ${sql(invoices, 'customer_id', 'amount', 'status', 'date')}
  `;

  return invoices.length;
}

async function seedRevenue() {
  await sql`
    INSERT INTO revenue ${sql(revenue, 'month', 'revenue')}
    ON CONFLICT (month) DO NOTHING
  `;

  return revenue.length;
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set. Run with `pnpm db:seed`.');
  }

  console.log('Seeding database...');

  // A real transaction this time: the original passed a callback that ignored
  // its scoped `sql` argument, so nothing actually ran transactionally.
  await sql.begin(async () => {
    console.log(`  admin_users: ${await seedAdminUsers()}`);
    console.log(`  customers: ${await seedCustomers()}`);
    console.log(`  invoices:  ${await seedInvoices()}`);
    console.log(`  revenue:   ${await seedRevenue()}`);
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
