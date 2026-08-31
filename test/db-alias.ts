/**
 * Lo que `@/db` significa durante las pruebas.
 *
 * `vitest.config.mts` redirige `@/db` aquí, así que todo el código de dominio
 * —servicios, consultas, acciones— habla con la base de PGlite **sin saberlo y
 * sin cambiar una línea**. Esa es la condición para que las pruebas verifiquen
 * el código que corre en producción y no una variante escrita para pasar.
 *
 * La alternativa era inyectar la base por parámetro en cada función. Habría
 * ensuciado ~40 firmas para beneficio de las pruebas, que es exactamente la
 * clase de contorsión que hace que un dominio deje de leerse.
 */
import { drizzle } from 'drizzle-orm/pglite';

import { testDb } from './db';

/**
 * El `db` que importa el dominio.
 *
 * Es un proxy porque `testDb()` es asíncrono —hay que aplicar migraciones— y el
 * dominio importa `db` de forma síncrona en el momento de evaluar el módulo.
 * Para cuando alguien llame a un método, el `beforeAll` de la suite ya lo
 * inicializó.
 */
let instance: ReturnType<typeof drizzle> | undefined;

export async function initTestDb() {
  instance = await testDb();
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!instance) {
      throw new Error(
        'La base de pruebas no está lista. Falta `await initTestDb()` en el beforeAll de la suite.',
      );
    }

    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const sql = undefined as never;
