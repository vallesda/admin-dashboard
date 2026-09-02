import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo: navegador → tienda → admin → Stripe → vuelta.
 *
 * Separadas de Vitest a propósito. Las tres capas de `vitest.config.mts`
 * (dominio, base, componente) corren sin red y en segundos; esto abre un
 * navegador, habla con Stripe y necesita las dos apps levantadas. Mezclarlas
 * haría lento lo que hoy es rápido y frágil lo que hoy es determinista.
 *
 * ```bash
 * pnpm dev            # admin  :3000
 * pnpm --filter storefront dev   # tienda :3001
 * stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * pnpm e2e
 * ```
 */
export default defineConfig({
  testDir: './e2e',
  // Repone el inventario que estas pruebas consumen; sin esto la suite se agota
  // sola a las pocas corridas. Ver el archivo para el porqué.
  globalSetup: './e2e/global-setup.ts',
  /*
   * En serie, no en paralelo.
   *
   * Cada prueba aparta stock real de la base de desarrollo y algunas lo liberan
   * al terminar. En paralelo competirían por las mismas existencias y fallarían
   * por agotado en vez de por el motivo que prueban.
   */
  workers: 1,
  fullyParallel: false,
  /*
   * Sin reintentos.
   *
   * Una prueba que toca dinero y pasa «a la segunda» está escondiendo una
   * carrera, que es justo la clase de fallo que esta suite existe para
   * encontrar. Ver DOCS/PAGOS-VERIFICACION.md §3quater.
   */
  retries: 0,
  // Stripe redirige despacio y el webhook tarda; el defecto de 30 s no basta.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.STOREFRONT_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
