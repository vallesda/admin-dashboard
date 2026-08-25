/**
 * Bootstrap seed: `pnpm db:seed`.
 *
 * A fresh database has no way in — no admin user means no login means no way to
 * create one. This creates that first account and nothing else.
 *
 * It no longer seeds customers, invoices or revenue: those were the tutorial's
 * demo data, and the ecommerce domain replaced them (DOCS/PLAN.md F4). Real
 * catalogue and customers are created through the admin.
 *
 * Idempotent: re-running never overwrites an existing account, so it cannot
 * reset a password someone has already changed.
 */
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const BOOTSTRAP_ADMIN = {
  name: 'User',
  email: 'user@nextmail.com',
  password: '123456',
  // `owner`: this account has to be able to create the others.
  role: 'owner' as const,
};

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set. Run with `pnpm db:seed`.');
  }

  const [existing] = await sql`
    SELECT email FROM admin_users WHERE email = ${BOOTSTRAP_ADMIN.email}
  `;

  if (existing) {
    console.log(`Admin already exists: ${BOOTSTRAP_ADMIN.email} — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN.password, 10);

  await sql`
    INSERT INTO admin_users (name, email, password_hash, role, active)
    VALUES (
      ${BOOTSTRAP_ADMIN.name},
      ${BOOTSTRAP_ADMIN.email},
      ${passwordHash},
      ${BOOTSTRAP_ADMIN.role},
      true
    )
    ON CONFLICT (email) DO NOTHING
  `;

  console.log(`Created admin: ${BOOTSTRAP_ADMIN.email} (${BOOTSTRAP_ADMIN.role})`);
  console.log('Change this password before deploying anywhere real.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
