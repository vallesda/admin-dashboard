import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Pruebas de la tienda.
 *
 * Separada de la del panel a propósito: los dos son despliegues distintos y
 * esta carpeta va a mudarse a su propio repositorio. Una configuración
 * compartida sería una dependencia que habría que deshacer justo cuando menos
 * apetece.
 *
 * Aquí no hay base de datos. La tienda no habla con Postgres —pide todo al
 * panel por HTTP— así que no hay PGlite, ni migraciones, ni `fileParallelism:
 * false`. Es la diferencia que más se nota: esta suite arranca en un instante.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      /*
       * `server-only` lanza al importarse fuera de un Server Component. Sin
       * este doble, probar cualquier componente que toque `lib/commerce` es
       * imposible: la importación muere antes de llegar a la prueba.
       *
       * Anclado y antes que el alias general, para que `@/` no se lo coma.
       */
      { find: /^server-only$/, replacement: root('./test/server-only-stub.ts') },
      { find: /^@\//, replacement: `${root('.')}/` },
    ],
  },
  test: {
    /*
     * `node` por defecto, y el DOM se pide por archivo con
     * `@vitest-environment happy-dom` en la cabecera.
     *
     * Misma razón que en el panel: `environmentMatchGlobs` dejó de aplicarse en
     * Vitest 4 **en silencio**, y una directiva dentro del archivo que la
     * necesita no puede desincronizarse de la configuración.
     */
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'app/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
