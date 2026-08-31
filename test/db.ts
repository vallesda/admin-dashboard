/**
 * La base de datos de las pruebas.
 *
 * Es **PostgreSQL de verdad** —PGlite es Postgres 18 compilado a WebAssembly—
 * corriendo dentro del propio proceso de Vitest. Sin servidor, sin contenedor,
 * sin variable de entorno: `pnpm test` levanta una base vacía, le aplica las
 * migraciones reales del repositorio y la tira al terminar.
 *
 * ## Por qué esto y no un mock de Drizzle
 *
 * Casi todo lo que hay que probar en este sistema **vive en la base**: los
 * `CHECK` que impiden reservar más de lo que hay, los triggers que hacen el
 * libro de inventario inmodificable, los `ON DELETE RESTRICT` que protegen la
 * historia, la unicidad de un código postal por zona. Un mock de Drizzle probaría
 * que el mock funciona.
 *
 * ## Por qué esto y no la base real
 *
 * Ya pasó tres veces en este proyecto: pruebas manuales dejaron categorías
 * inventadas, pedidos «QA» y un pago con un id de sesión que Stripe no conoce.
 * Una suite apuntada a la base de trabajo lo haría en cada corrida.
 *
 * ## El contrato
 *
 * `resetDatabase()` vacía todas las tablas entre pruebas, así que cada una
 * empieza de cero y el orden no importa. Las migraciones se aplican **una vez**
 * por proceso: son 14 y no cambian entre pruebas.
 */
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'db/migrations');

let client: PGlite | undefined;
let database: ReturnType<typeof drizzle> | undefined;

/**
 * Aplica las migraciones del repositorio, en orden y a mano.
 *
 * No se usa el migrador de Drizzle a propósito: guarda su propia tabla de
 * control y aquí la base es nueva en cada proceso, así que el registro no sirve
 * para nada. Leerlas y ejecutarlas es más simple y falla más claro.
 *
 * Se parten por `--> statement-breakpoint`, que es lo que drizzle-kit escribe
 * entre sentencias que no pueden ir juntas — un `ALTER TYPE ... ADD VALUE`, por
 * ejemplo.
 */
async function applyMigrations(pg: PGlite): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const contents = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    for (const statement of contents.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await pg.exec(trimmed);
      } catch (error) {
        // El nombre del archivo y la sentencia, porque «syntax error at or near»
        // sin contexto en 14 migraciones es una tarde perdida.
        throw new Error(
          `Falló la migración ${file}:\n${trimmed.slice(0, 300)}\n\n${String(error)}`,
        );
      }
    }
  }
}

/** La base de pruebas, creada la primera vez que alguien la pide. */
export async function testDb() {
  if (!database) {
    client = new PGlite();
    await applyMigrations(client);
    database = drizzle(client);
  }

  return database;
}

/**
 * Deja la base como recién migrada.
 *
 * `TRUNCATE ... RESTART IDENTITY CASCADE` sobre todo el esquema público en una
 * sola sentencia: es más rápido que borrar tabla por tabla y no hay que
 * mantener la lista ni el orden de las claves foráneas.
 *
 * `RESTART IDENTITY` importa más de lo que parece: sin él, `orderNumber` seguiría
 * creciendo entre pruebas y una que afirme «el pedido #1» pasaría sola y
 * fallaría junto a las demás.
 */
export async function resetDatabase(): Promise<void> {
  const db = await testDb();

  const tables = await db.execute<{ tablename: string }>(sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '__drizzle_migrations'
  `);

  const names = tables.rows
    .map((r) => `"${r.tablename}"`)
    .join(', ');

  if (names) {
    await db.execute(
      sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`),
    );
  }
}

export async function closeDatabase(): Promise<void> {
  await client?.close();
  client = undefined;
  database = undefined;
}
