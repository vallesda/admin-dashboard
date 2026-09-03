/**
 * Bootstrap seed: `pnpm db:seed`.
 *
 * Una base recién migrada no tiene puerta: sin usuario no hay login, y sin login
 * no hay forma de crear uno. Esto crea esas primeras cuentas y nada más. El
 * catálogo y los clientes reales se dan de alta desde el panel.
 *
 * ## Ninguna contraseña vive en este archivo
 *
 * La versión anterior sembraba `user@nextmail.com` con la contraseña `123456`,
 * incrustada aquí y versionada en el repositorio. Esa cuenta llegó a la base de
 * producción con rol `owner`, activa, y ahí siguió — y como no hay límite de
 * intentos en el login, era la puerta abierta más grande del sistema.
 *
 * Ahora cada contraseña se **genera al azar** y se imprime **una sola vez**. No
 * hay valor por defecto que copiar, no hay nada que se pueda leer en un `git
 * log`, y no existe un secreto compartido entre despliegues.
 *
 * Se puede fijar una a mano con `BOOTSTRAP_PASSWORD` para automatizar una
 * puesta en marcha, pero es la excepción y el script avisa de que esa
 * contraseña queda en el historial del shell.
 *
 * ## Idempotente
 *
 * Una cuenta que ya existe no se toca: reejecutar esto nunca reescribe una
 * contraseña que alguien ya cambió. Lo que se salta, lo dice.
 */
import { randomBytes } from 'node:crypto';

import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Una cuenta por rol, para poder probar el panel como cada figura.
 *
 * Los tres roles del sistema en orden de privilegio (`db/schema/identity.ts`).
 * `owner` va primero porque es la única que puede crear las demás desde la
 * interfaz: si sólo se sembrara una, tendría que ser ésa.
 */
const ACCOUNTS = [
  { name: 'Dueño', email: 'owner@amoramar.mx', role: 'owner' as const },
  { name: 'Administración', email: 'admin@amoramar.mx', role: 'admin' as const },
  { name: 'Mostrador', email: 'staff@amoramar.mx', role: 'staff' as const },
];

/**
 * Una contraseña que nadie va a adivinar y que nadie tiene que inventar.
 *
 * 24 caracteres de base64url sobre 18 bytes de entropía criptográfica: ~144
 * bits. Se descartan `+/=` para que se pueda copiar de una terminal y pegar en
 * un formulario sin que un escape la corte por la mitad.
 */
function strongPassword(): string {
  return randomBytes(18).toString('base64url');
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL no está definido. Corre con `pnpm db:seed`.');
  }

  const override = process.env.BOOTSTRAP_PASSWORD?.trim();

  if (override && override.length < 12) {
    throw new Error(
      'BOOTSTRAP_PASSWORD tiene menos de 12 caracteres. Déjalo sin definir y ' +
        'el seed genera una fuerte por cuenta.',
    );
  }

  const created: { email: string; role: string; password: string }[] = [];
  const skipped: string[] = [];

  for (const account of ACCOUNTS) {
    const [existing] = await sql`
      SELECT email FROM admin_users WHERE email = ${account.email}
    `;

    if (existing) {
      skipped.push(account.email);
      continue;
    }

    const password = override ?? strongPassword();

    await sql`
      INSERT INTO admin_users (name, email, password_hash, role, active)
      VALUES (
        ${account.name},
        ${account.email},
        ${await bcrypt.hash(password, 10)},
        ${account.role},
        true
      )
      ON CONFLICT (email) DO NOTHING
    `;

    created.push({ email: account.email, role: account.role, password });
  }

  for (const email of skipped) {
    console.log(`· ya existe, sin tocar: ${email}`);
  }

  if (created.length === 0) {
    console.log('\nNada que crear.');
    return;
  }

  /*
   * La única vez que estas contraseñas son legibles.
   *
   * No se guardan en ningún sitio ni se pueden recuperar: sólo existe su hash.
   * Si se pierden, se resetean desde el panel con la cuenta `owner`.
   */
  console.log('\n  Cuentas creadas — apunta esto ahora, no se vuelve a mostrar:\n');
  for (const c of created) {
    console.log(`    ${c.role.padEnd(6)}  ${c.email.padEnd(22)}  ${c.password}`);
  }

  if (override) {
    console.log(
      '\n  Aviso: usaste BOOTSTRAP_PASSWORD, así que esa contraseña quedó en el\n' +
        '  historial de tu shell y es la misma para las tres cuentas. Cámbialas\n' +
        '  desde el panel antes de que esto sea público.',
    );
  }

  console.log();
}

main()
  .catch((error) => {
    console.error('El seed falló:', error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
