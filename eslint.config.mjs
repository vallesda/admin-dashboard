import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
 
const eslintConfig = defineConfig([
  ...nextVitals,
  /*
   * `.next/**` only ignored the admin's own build output. `pnpm lint` at the
   * repo root also walks `storefront/`, so every one of the storefront's
   * compiled chunks was being linted — 295 "errors" in generated JavaScript
   * that drowned out anything real. Any nested build directory, not just ours.
   */
  globalIgnores([
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/node_modules/**',
    'next-env.d.ts',
  ]),
]);
 
export default eslintConfig;