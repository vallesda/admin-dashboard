import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Domain tests. No database, no browser, no network.
 *
 * `DT-008` — the panel has shipped four phases with no test at all, and the
 * bugs that actually appeared while operating it (`itemCount` always 0, the
 * category that erased itself on edit, the invisible product with no inventory)
 * all **failed silently**. That is exactly the class a domain test catches and
 * a manual click-through does not.
 *
 * The scope is deliberate: pure rules only. Anything needing Postgres is
 * verified end-to-end against the running app instead, because a test that
 * mocks Drizzle proves the mock works.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      /*
       * `server-only` throws on import outside a React Server Component, which
       * is exactly its job — and which makes any module carrying it untestable
       * by default. Stubbed here rather than removed from the source: the guard
       * is doing real work in the app, and a test runner is not a client bundle.
       */
      'server-only': fileURLToPath(
        new URL('./test/server-only-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['modules/**/*.test.ts', 'lib/**/*.test.ts'],
  },
});
