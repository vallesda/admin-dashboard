import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, spawn } from 'node:child_process';

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
  /*
   * Un reintento, y sólo para lecturas.
   *
   * La base de desarrollo es Neon, que cierra las conexiones ociosas del pool.
   * Cuando eso pasa a mitad de una tanda larga, el admin devuelve 500 con un
   * `ECONNRESET` debajo: no es una afirmación sobre el producto, es la
   * infraestructura parpadeando, y hace fallar pruebas que están bien.
   *
   * **Nunca en escrituras.** `POST /checkout` crea un pedido y aparta stock;
   * reintentarlo a ciegas crearía dos y el segundo se quedaría colgado. Un 500
   * al escribir tiene que fallar la prueba y que alguien lo mire.
   */
  const isRead = !init.method || init.method.toUpperCase() === 'GET';
  const attempts = isRead ? 3 : 1;
  let last = '';

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(`${ADMIN_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env().STOREFRONT_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const body = await res.json();
    if (res.ok) return body.data as T;

    last = `${path} → ${res.status} ${JSON.stringify(body)}`;

    // Un 4xx es una respuesta, no un parpadeo: se propaga tal cual.
    if (res.status < 500 || attempt === attempts) break;
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }

  throw new Error(last);
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
export async function openCheckoutPage(page: Page, url: string): Promise<void> {
  /*
   * `domcontentloaded`, no `load`.
   *
   * La página alojada de Stripe sigue cargando recursos mucho después de ser
   * usable, y en una tanda larga —veinte sesiones seguidas— el `load` por
   * defecto llega a agotar el tiempo. Falla la prueba sin que nada esté mal:
   * los dos únicos fallos de la primera suite completa fueron esto.
   *
   * Lo que de verdad indica que se puede pagar es que exista el campo de la
   * tarjeta, y de eso ya se ocupa `payWithCard`.
   */
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
}

export async function payWithCard(page: Page, card: string): Promise<void> {
  await expect(
    page.locator('#cardNumber'),
    'No apareció el formulario de Stripe. Si la página cargó, es que Stripe cambió sus selectores.',
  ).toBeVisible({ timeout: 60_000 });

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

// ---------------------------------------------------------------------------
// El reenvío de webhooks, encendido y apagado
// ---------------------------------------------------------------------------

/**
 * Poder apagar `stripe listen` es lo que hace posible el escenario P11.
 *
 * La página de retorno y el webhook llaman a la misma `fulfillCheckout`, así
 * que con los dos vivos no se puede saber cuál hizo el trabajo. Apagando el
 * reenvío queda sólo la página, que es exactamente lo que hay que probar: que
 * el comprador ve «Pagado» aunque el webhook no haya llegado.
 *
 * Se puede reiniciar sin tocar `.env.local` porque el `whsec_` del CLI es
 * **estable por cuenta y dispositivo** —`stripe listen --print-secret` devuelve
 * el mismo—, cosa que no es obvia y que conviene no volver a averiguar.
 */
/*
 * Sólo «stripe listen», sin banderas.
 *
 * La primera versión buscaba `stripe listen --forward-to` y **nunca encontraba
 * nada**: la línea real lleva `--api-key <clave>` entre medias. `pkill` fallaba
 * en silencio, `pgrep` tampoco veía el proceso y `stopWebhookForwarding` daba
 * por apagado algo que seguía corriendo — así que P11 pasaba con el webhook
 * vivo, es decir, sin probar lo único que existe para probar.
 */
const LISTEN_MATCH = 'stripe listen';

export function forwardingRunning(): boolean {
  try {
    execSync(`pgrep -f "${LISTEN_MATCH}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function stopWebhookForwarding(): Promise<void> {
  try {
    execSync(`pkill -f "${LISTEN_MATCH}"`, { stdio: 'pipe' });
  } catch {
    /* ya estaba apagado */
  }

  await waitFor(() => !forwardingRunning(), 'apagar stripe listen');
}

export async function startWebhookForwarding(): Promise<void> {
  if (forwardingRunning()) return;

  spawn(
    'stripe',
    [
      'listen',
      '--api-key',
      env().STRIPE_SECRET_KEY,
      '--forward-to',
      `${ADMIN_URL}/api/webhooks/stripe`,
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  await waitFor(() => forwardingRunning(), 'encender stripe listen');
  // Arrancar el proceso no es estar conectado a Stripe; sin este margen el
  // primer evento del test siguiente se pierde y falla algo que sí funciona.
  await new Promise((r) => setTimeout(r, 3_000));
}

async function waitFor(
  ok: () => boolean,
  what: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (ok()) return;
    await new Promise((r) => setTimeout(r, 250));
  }

  throw new Error(`No se pudo ${what} en ${timeoutMs / 1000}s.`);
}

/** Crea un pedido en línea por la API, sin pasar por el navegador. */
export async function createOnlineOrder(
  productId: string,
  quantity = 1,
): Promise<{ orderNumber: number; token: string; checkoutUrl: string }> {
  const result = await adminApi<{
    orderNumber: number;
    token: string;
    payment: { checkoutUrl: string };
  }>('/api/v1/checkout', {
    method: 'POST',
    body: JSON.stringify({
      customer: {
        name: 'Prueba Automatizada',
        phone: '6121234567',
        email: 'e2e@example.com',
      },
      fulfillmentType: 'pickup',
      paymentMode: 'online',
      returnUrls: {
        success: 'http://localhost:3001/pedido/{TOKEN}',
        cancel: 'http://localhost:3001/checkout',
      },
      lines: [{ productId, quantity }],
    }),
  });

  return {
    orderNumber: result.orderNumber,
    token: result.token,
    checkoutUrl: result.payment.checkoutUrl,
  };
}

/** `cs_test_…` dentro de una URL de Checkout. */
export function sessionIdOf(checkoutUrl: string): string {
  const match = /cs_(?:test|live)_[A-Za-z0-9]+/.exec(checkoutUrl);
  if (!match) throw new Error(`No hay sesión en la URL: ${checkoutUrl}`);
  return match[0];
}

/**
 * Vence una sesión de Checkout desde la API de Stripe.
 *
 * Es lo que permite probar el abandono sin esperar las 24 horas que tarda en
 * caducar sola, y emite el mismo `checkout.session.expired` que emitiría
 * entonces — así que lo que se ejercita es el manejador de verdad.
 */
export async function expireSession(sessionId: string): Promise<void> {
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}/expire`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env().STRIPE_SECRET_KEY}` },
    },
  );

  if (!res.ok) {
    throw new Error(`No se pudo vencer ${sessionId}: ${await res.text()}`);
  }
}

/**
 * El reto de 3D Secure, que Stripe sirve en un iframe anidado.
 *
 * Se busca por **nombre entre todos los marcos de la página** y no con un
 * `frameLocator` encadenado: el reto vive dentro de otro iframe de Stripe, y
 * junto a él conviven un `__privateStripeFrame` del express checkout y dos de
 * hCaptcha. Un selector posicional —`.last()`, que es lo que había— coge el
 * equivocado según lo que haya cargado ese día.
 *
 * `page.frames()` no depende de la profundidad ni del orden, sólo del nombre,
 * que es lo único estable aquí.
 */
async function challengeFrame(page: Page, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const frame = page.frames().find((f) => f.name() === 'stripe-challenge-frame');
    if (frame) return frame;
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(
    'No apareció el reto 3DS. ¿Cambió la tarjeta de prueba, o Stripe su página?',
  );
}

/** Autentica el reto. El pago se completa. */
export async function complete3ds(page: Page): Promise<void> {
  const frame = await challengeFrame(page);
  await frame.getByRole('button', { name: /^complete$/i }).click();
}

/** Rechaza el reto. El pago no se cobra. */
export async function fail3ds(page: Page): Promise<void> {
  const frame = await challengeFrame(page);
  await frame.getByRole('button', { name: /^fail$/i }).click();
}

/** Si el reto está en pantalla, todavía no se ha movido un peso. */
export async function waitForChallenge(page: Page): Promise<void> {
  await challengeFrame(page);
}

/** Lee una sesión de Checkout desde Stripe. Para comprobar qué se va a cobrar. */
export async function stripeSession(
  sessionId: string,
): Promise<{ amount_total: number; currency: string }> {
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
    { headers: { Authorization: `Bearer ${env().STRIPE_SECRET_KEY}` } },
  );

  if (!res.ok) throw new Error(`No se pudo leer ${sessionId}: ${await res.text()}`);
  return res.json();
}

/** El precio de catálogo, que es el único que decide cuánto se cobra. */
export async function priceOf(productId: string): Promise<number> {
  const page = await adminApi<{
    items: { id: string; price: { amountCents: number } }[];
  }>('/api/v1/catalog/products?limit=100');

  const item = page.items.find((p) => p.id === productId);
  if (!item) throw new Error(`Producto no encontrado: ${productId}`);
  return item.price.amountCents;
}
