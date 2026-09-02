import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { E2E_SLUG } from './global-setup';

/**
 * Lo compartido por las pruebas de extremo a extremo.
 *
 * Sobre todo `payWithCard`: rellenar la página alojada de Stripe es la única
 * parte de este flujo que no se puede ejercitar por API —no existe endpoint
 * para completar un Checkout alojado— y es la que estaba impidiendo cerrar la
 * matriz de `DOCS/PAGOS-VERIFICACION.md`.
 */

/** `.env.local` no lo lee ni Playwright ni Vitest; son seis líneas. */
export function env(): Record<string, string> {
  const out: Record<string, string> = {};

  try {
    // Playwright transpila a CJS, así que nada de `import.meta`. Corre desde
    // la raíz del proyecto, que es donde vive el archivo.
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sin archivo, se usa el entorno del proceso */
  }

  return { ...out, ...process.env } as Record<string, string>;
}

export const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:3000';

/** Tarjetas de prueba de Stripe. Ninguna mueve dinero real. */
export const CARDS = {
  ok: '4242424242424242',
  declined: '4000000000000002',
  requires3ds: '4000002500003155',
  insufficientFunds: '4000000000009995',
} as const;

/** Llama a la API del admin con el token de servicio. */
export async function adminApi<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ADMIN_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env().STOREFRONT_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(body)}`);
  return body.data as T;
}

type CatalogItem = {
  id: string;
  handle: string;
  name: string;
  available: number;
  availableForSale: boolean;
};

/**
 * Un producto que de verdad se puede comprar ahora mismo.
 *
 * Se descubre en vez de fijarse: la base de desarrollo cambia, y una prueba
 * anclada a un UUID falla por «producto agotado» sin decir que el problema es
 * el dato y no el código.
 */
export async function buyableProduct(minStock = 1): Promise<CatalogItem> {
  const page = await adminApi<{ items: CatalogItem[] }>('/api/v1/catalog/products?limit=100');
  const usable = page.items.filter((p) => p.availableForSale && p.available >= minStock);

  /*
   * El producto de pruebas primero.
   *
   * `global-setup.ts` lo repone en cada corrida, así que es el único con stock
   * garantizado. Gastar catálogo real funcionaría hasta agotarlo —y de paso
   * distorsiona los números que el panel enseña—, así que sólo es el respaldo.
   */
  const item = usable.find((p) => p.handle === E2E_SLUG) ?? usable[0];

  if (!item) {
    throw new Error(
      `No hay ningún producto con ${minStock} de stock. El setup global debería ` +
        'haber repuesto el producto de pruebas: revisa POSTGRES_URL.',
    );
  }

  return item;
}

export async function stockOf(productId: string): Promise<number> {
  const page = await adminApi<{ items: CatalogItem[] }>('/api/v1/catalog/products?limit=100');
  return page.items.find((p) => p.id === productId)?.available ?? -1;
}

export type OrderView = {
  orderNumber: number;
  status: string;
  paymentStatus: string;
  total: { amountCents: number };
  payment: {
    status: string;
    methodLabel: string | null;
    amountPaid: { amountCents: number };
    amountRefunded: { amountCents: number };
  };
};

export const orderByToken = (token: string) =>
  adminApi<OrderView>(`/api/v1/orders/${token}`);

/**
 * Paga la página alojada de Stripe.
 *
 * Los selectores son los de Checkout alojado. Van por `#id` porque los nombres
 * de clase de Stripe están ofuscados y cambian entre despliegues; los ids no.
 * Si alguna vez esto rompe, es señal de que Stripe cambió su página, no de que
 * la tienda esté mal — el mensaje del `expect` lo dice para quien lo herede.
 */
export async function payWithCard(page: Page, card: string): Promise<void> {
  await expect(
    page.locator('#cardNumber'),
    'No apareció el formulario de Stripe. Si la página cargó, es que Stripe cambió sus selectores.',
  ).toBeVisible({ timeout: 30_000 });

  await page.locator('#cardNumber').fill(card);
  await page.locator('#cardExpiry').fill('12' + String(new Date().getFullYear() + 3).slice(-2));
  await page.locator('#cardCvc').fill('123');
  await page.locator('#billingName').fill('Prueba Automatizada');

  // Sólo aparece en algunos países y configuraciones de cuenta.
  const zip = page.locator('#billingPostalCode');
  if (await zip.count()) await zip.fill('23000');

  await page.locator('button[type="submit"]').first().click();
}

/**
 * Espera a que el webhook haga su trabajo.
 *
 * Sondea la API en vez de dormir un número mágico de segundos: el webhook tarda
 * lo que tarda, y un `waitForTimeout` o va sobrado o falla el día que Stripe va
 * lento.
 */
export async function waitForPaymentStatus(
  token: string,
  expected: string,
  timeoutMs = 30_000,
): Promise<OrderView> {
  const deadline = Date.now() + timeoutMs;
  let last: OrderView | undefined;

  while (Date.now() < deadline) {
    last = await orderByToken(token);
    if (last.paymentStatus === expected) return last;
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(
    `El pedido nunca llegó a "${expected}" (se quedó en "${last?.paymentStatus}"). ` +
      '¿Está corriendo `stripe listen --forward-to localhost:3000/api/webhooks/stripe`?',
  );
}
