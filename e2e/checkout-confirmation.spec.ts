import { test, expect } from '@playwright/test';

import {
  ADMIN_URL,
  CARDS,
  adminApi,
  buyableProduct,
  createOnlineOrder,
  openCheckoutPage,
  env,
  forwardingRunning,
  orderByToken,
  payWithCard,
  requireWebhookForwarding,
  startWebhookForwarding,
  stopWebhookForwarding,
  waitForPaymentStatus,
} from './helpers';

/**
 * La vuelta de Stripe.
 *
 * `DOCS/PAGOS.md` §11.1 dice que el webhook **y** la página de retorno llaman a
 * la misma `fulfillCheckout`: el webhook porque nadie garantiza que el
 * comprador llegue a la página, y la página porque el webhook a veces tarda y
 * el comprador está mirando la pantalla *ahora*.
 *
 * Con los dos vivos no se puede saber cuál hizo el trabajo. Por eso el primer
 * escenario apaga el reenvío: es la única forma de probar que la página se
 * basta sola, que es lo que `F7.01` prometía y nunca se había ejecutado.
 */

test.describe('sin webhook (matriz #6 · F7.01)', () => {
  test.beforeAll(async () => {
    await stopWebhookForwarding();
  });

  test.afterAll(async () => {
    // Pase lo que pase con la prueba: dejarlo apagado rompería en silencio todo
    // lo que corra después.
    await startWebhookForwarding();
  });

  test('la página de retorno confirma el pago por su cuenta', async ({ page }) => {
    /*
     * Primero: comprobar que de verdad está apagado.
     *
     * La primera versión de esta prueba pasó con el webhook **vivo** — el
     * patrón de `pkill` no encontraba el proceso y `stopWebhookForwarding`
     * mentía. Una prueba que no puede fallar no prueba nada, así que el estado
     * del que depende se afirma en vez de suponerse.
     */
    expect(
      forwardingRunning(),
      'stripe listen sigue vivo: esta prueba mediría el webhook, no la página',
    ).toBe(false);

    const product = await buyableProduct();
    const order = await createOnlineOrder(product.id);

    await openCheckoutPage(page, order.checkoutUrl);
    await payWithCard(page, CARDS.ok);

    await page.waitForURL(/\/pedido\//, {
      timeout: 60_000,
      /*
       * `domcontentloaded`, no el `load` por defecto.
       *
       * La página del pedido arrastra recursos —fotos de producto, el
       * mapa— y esperar a que **todos** terminen agotó el tiempo en
       * tandas largas: la redirección de Stripe sí había llegado. Lo
       * que hace falta saber aquí es que estamos en la página, y de
       * los datos ya se ocupa `waitForPaymentStatus` contra la API.
       */
      waitUntil: 'domcontentloaded',
    });

    /*
     * Lo que se mide: el comprador ve «Pagado» sin que ningún webhook haya
     * llegado. Sin esta pieza el sistema dependería de que Stripe entregue el
     * evento dentro de los 10 s que Checkout espera antes de redirigir — y
     * «casi siempre» es exactamente lo que este proyecto decidió no suponer.
     */
    const fresh = await orderByToken(order.token);
    expect(fresh.paymentStatus).toBe('paid');
    expect(fresh.status).toBe('confirmed');
    expect(fresh.payment.amountPaid.amountCents).toBe(fresh.total.amountCents);

    // Y lo ve en la página, no sólo en la API.
    await expect(page.getByText(/pagado/i).first()).toBeVisible();
  });
});

test.describe('confirmar de más', () => {
  // Aquí sí hace falta: si P11 no consiguió reponer el reenvío, esta prueba
  // fallaría culpando a la idempotencia de algo que nunca llegó.
  test.beforeAll(requireWebhookForwarding);

  test('recargar la página no cobra ni confirma dos veces', async ({ page }) => {
    const product = await buyableProduct();
    const order = await createOnlineOrder(product.id);

    await openCheckoutPage(page, order.checkoutUrl);
    await payWithCard(page, CARDS.ok);
    await page.waitForURL(/\/pedido\//, {
      timeout: 60_000,
      /*
       * `domcontentloaded`, no el `load` por defecto.
       *
       * La página del pedido arrastra recursos —fotos de producto, el
       * mapa— y esperar a que **todos** terminen agotó el tiempo en
       * tandas largas: la redirección de Stripe sí había llegado. Lo
       * que hace falta saber aquí es que estamos en la página, y de
       * los datos ya se ocupa `waitForPaymentStatus` contra la API.
       */
      waitUntil: 'domcontentloaded',
    });

    const paid = await waitForPaymentStatus(order.token, 'paid');

    /*
     * Tres visitas más a la misma URL, con su `session_id` intacto.
     *
     * `domcontentloaded` y no el `load` por defecto: la página del pedido
     * arrastra recursos —imágenes de producto, el mapa si alguien lo abrió— y
     * esperar a que **todos** terminen colgó la prueba en una tanda larga. Lo
     * que se está midiendo es que confirmar tres veces no cobre tres veces, y
     * para eso basta con que el servidor haya respondido.
     */
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' });
    }

    const after = await orderByToken(order.token);

    // `fulfillCheckout` es idempotente o no lo es; esto es lo que lo dice.
    expect(after.payment.amountPaid.amountCents).toBe(
      paid.payment.amountPaid.amountCents,
    );
    expect(after.paymentStatus).toBe('paid');
  });
});

test.describe('el session_id viaja en una URL que el cliente puede editar', () => {
  test('no se puede confirmar un pedido con la sesión de otro', async () => {
    /*
     * El diputado confundido. Sin esta comprobación, pasar el `session_id` de
     * otra persona haría que confirmáramos **su** pedido — el webhook no tiene
     * el problema porque es Stripe quien le dice de qué sesión habla, pero a
     * este endpoint se lo dice quien pregunta.
     */
    const product = await buyableProduct(2);
    const mine = await createOnlineOrder(product.id);
    const theirs = await createOnlineOrder(product.id);

    const sessionOfTheirs = /cs_test_[A-Za-z0-9]+/.exec(theirs.checkoutUrl)![0];

    const res = await fetch(
      `${ADMIN_URL}/api/v1/orders/${mine.token}/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env().STOREFRONT_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: sessionOfTheirs }),
      },
    );

    expect(res.status).toBe(403);

    // Y ninguno de los dos se movió.
    expect((await orderByToken(mine.token)).paymentStatus).toBe('unpaid');
    expect((await orderByToken(theirs.token)).paymentStatus).toBe('unpaid');
  });

  test('un token inventado no existe', async () => {
    const res = await fetch(
      `${ADMIN_URL}/api/v1/orders/00000000-0000-4000-8000-000000000000`,
      { headers: { Authorization: `Bearer ${env().STOREFRONT_API_TOKEN}` } },
    );

    expect(res.status).toBe(404);
  });
});

test.describe('la tienda no sabe quién cobra', () => {
  test('la respuesta del pedido nunca nombra al proveedor', async () => {
    // La costura de `DOCS/PAGOS.md` §8.2: el día que la tienda sea otro
    // despliegue, no puede llevar Stripe dentro.
    const product = await buyableProduct();
    const order = await createOnlineOrder(product.id);

    const raw = JSON.stringify(await adminApi(`/api/v1/orders/${order.token}`));

    expect(raw.toLowerCase()).not.toContain('stripe');
  });
});
