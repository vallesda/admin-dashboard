import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

/**
 * Configuración de pruebas.
 *
 * Tres capas, un solo comando:
 *
 * - **dominio** — reglas puras, sin base ni DOM. Milisegundos.
 * - **base** — servicios, consultas y acciones reales contra PostgreSQL real,
 *   corriendo dentro del proceso (PGlite). Ver `test/db.ts`.
 * - **componente** — React en `happy-dom`, sólo donde hay comportamiento que
 *   probar.
 *
 * `DT-008` decía que el panel había desplegado cuatro fases sin una sola
 * prueba, y que los bugs que aparecieron operándolo —`itemCount` siempre 0, la
 * categoría que se borraba al editar, el producto invisible sin inventario—
 * **fallaban en silencio**. Esa es exactamente la clase que estas tres capas
 * atrapan y una revisión manual no.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    /*
     * Array y no objeto, y el orden importa.
     *
     * En forma de objeto, `'@'` hacía sustitución por prefijo y se comía
     * `@/db` antes de que se llegara a mirar el alias específico — las pruebas
     * de servicio acababan hablando con la base **de trabajo** en `:5432`.
     * También se habría comido `@testing-library/react`.
     *
     * Con expresiones regulares ancladas cada alias dice exactamente qué
     * captura, y el específico va primero.
     */
    alias: [
      /*
       * La base de las pruebas es PostgreSQL de verdad, en proceso.
       *
       * Redirigir `@/db` es lo que permite que servicios, consultas y acciones
       * corran **sin modificar** contra una base efímera. La alternativa
       * —inyectar la conexión por parámetro— habría ensuciado ~40 firmas para
       * beneficio de las pruebas, que es la clase de contorsión que hace que un
       * dominio deje de leerse.
       */
      { find: /^@\/db$/, replacement: root('./test/db-alias.ts') },

      /*
       * `server-only` lanza al importarse fuera de un Server Component, que es
       * exactamente su trabajo — y que vuelve intestable cualquier módulo que
       * lo lleve. Se sustituye aquí en vez de quitarlo del código: la guarda
       * hace trabajo real en la app, y un runner no es un bundle de cliente.
       */
      { find: /^server-only$/, replacement: root('./test/server-only-stub.ts') },

      // El alias general, al final y anclado a `@/`.
      { find: /^@\//, replacement: root('./') },
    ],
  },
  test: {
    /*
     * Node por defecto; el DOM se pide archivo por archivo con
     * `@vitest-environment happy-dom` en la cabecera.
     *
     * `environmentMatchGlobs` hacía lo mismo desde aquí y dejó de aplicarse en
     * Vitest 4 **en silencio**: las pruebas de componente corrían en Node y
     * morían con «document is not defined». Una directiva dentro del archivo
     * que la necesita no puede desincronizarse de la configuración.
     *
     * Y sigue valiendo la razón original: pagar `happy-dom` en las 134 pruebas
     * que no usan DOM multiplicaría el arranque de la suite.
     */
    environment: 'node',
    include: [
      'modules/**/*.test.{ts,tsx}',
      'lib/**/*.test.ts',
      'test/**/*.test.ts',
    ],
    setupFiles: ['./test/setup.ts'],
    /*
     * Un solo hilo.
     *
     * Cada archivo levantaría su propia instancia de PGlite, lo cual funciona
     * pero multiplica el coste de aplicar 14 migraciones. En serie, la base se
     * crea una vez y `resetDatabase()` la vacía entre pruebas.
     *
     * `fileParallelism: false`, no el `poolOptions.threads.singleThread` de
     * antes: Vitest 4 retiró `poolOptions` y esta es su sustituta directa —
     * los archivos corren uno detrás de otro en lugar de repartirse.
     */
    fileParallelism: false,
  },
});
