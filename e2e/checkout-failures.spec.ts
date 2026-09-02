import { test, expect } from '@playwright/test';

import {
  CARDS,
  buyableProduct,
  complete3ds,
  createOnlineOrder,
  openCheckoutPage,
  expireSession,
  fail3ds,
  orderByToken,
  payWithCard,
  sessionIdOf,
  stockOf,
  waitForChallenge,
  waitForPaymentStatus,
} from './helpers';

/**
 * Cuando el cobro no sale.
 *
 * Lo que se protege aquí **no es el mensaje de error**: es el pescado. Una
 * tarjeta rechazada no es un pedido abandonado — el comprador casi siempre
 * reintenta con otra— así que liberar el stock en ese momento le quitaría el
 * producto a alguien que sigue comprando. Y al revés: una sesión que venció sí
 * tiene que devolverlo, o `reserved` sólo crece.
 */

test('tarjeta rechazada: el pedido no avanza y el stock sigue apartado (matriz #2)', async ({
  page,
}) => {
  const product = await buyableProduct();
  const before = await stockOf(product.id);

  const order = await createOnlineOrder(product.id);

  // Reservado en cuanto el pedido existe, antes de que nadie pague nada.
  expect(await stockOf(product.id)).toBe(before - 1);

  await openCheckoutPage(page, order.checkoutUrl);
  await payWithCard(page, CARDS.declined);

  // Stripe se queda en su página y lo dice ahí mismo.
  await expect(
    page.getByText(/declin|rechaz/i).first(),
    'Stripe no mostró el rechazo en su propia página',
  ).toBeVisible({ timeout: 30_000 });

  const after = await orderByToken(order.token);
  expect(after.paymentStatus).toBe('unpaid');
  expect(after.status).not.toBe('cancelled');

  /*
   * La afirmación que importa. Si esto falla, alguien a quien le rebotó la
   * tarjeta pierde su producto mientras busca otra en la cartera.
   */
  expect(await stockOf(product.id)).toBe(before - 1);
});

test('fondos insuficientes: mismo trato que un rechazo', async ({ page }) => {
  const product = await buyableProduct();
  const order = await createOnlineOrder(product.id);
  const reserved = await stockOf(product.id);

  await openCheckoutPage(page, order.checkoutUrl);
  await payWithCard(page, CARDS.insufficientFunds);

  await expect(page.getByText(/declin|rechaz|fondos/i).first()).toBeVisible({
    timeout: 30_000,
  });

  expect((await orderByToken(order.token)).paymentStatus).toBe('unpaid');
  expect(await stockOf(product.id)).toBe(reserved);
});

test('3DS: sin autenticar no se cobra; autenticando sí (matriz #3)', async ({
  page,
}) => {
  const product = await buyableProduct();
  const order = await createOnlineOrder(product.id);

  await openCheckoutPage(page, order.checkoutUrl);
  await payWithCard(page, CARDS.requires3ds);

  await waitForChallenge(page);

  // Con el reto en pantalla todavía no se ha movido un peso.
  expect((await orderByToken(order.token)).paymentStatus).toBe('unpaid');

  await complete3ds(page);
  await page.waitForURL(/\/pedido\//, { timeout: 60_000 });

  const paid = await waitForPaymentStatus(order.token, 'paid');
  expect(paid.status).toBe('confirmed');
  expect(paid.payment.amountPaid.amountCents).toBe(paid.total.amountCents);
});

test('3DS rechazado: el pedido no avanza y el stock sigue apartado', async ({
  page,
}) => {
  const product = await buyableProduct();
  const before = await stockOf(product.id);
  const order = await createOnlineOrder(product.id);

  await openCheckoutPage(page, order.checkoutUrl);
  await payWithCard(page, CARDS.requires3ds);
  await fail3ds(page);

  // Mismo trato que un rechazo: el comprador puede reintentar, así que su
  // producto sigue siendo suyo.
  expect((await orderByToken(order.token)).paymentStatus).toBe('unpaid');
  expect(await stockOf(product.id)).toBe(before - 1);
});

test('sesión vencida: el stock vuelve a la venta (matriz #4)', async () => {
  const product = await buyableProduct();
  const before = await stockOf(product.id);

  const order = await createOnlineOrder(product.id, 2);
  expect(await stockOf(product.id)).toBe(before - 2);

  /*
   * Se fuerza el vencimiento en vez de esperar 24 h. Es el mismo evento que
   * Stripe emite solo —`checkout.session.expired`— así que lo que se ejercita
   * es el manejador real, no un atajo.
   */
  await expireSession(sessionIdOf(order.checkoutUrl));

  const released = await waitForOrderStatus(order.token, 'cancelled');
  expect(released.paymentStatus).toBe('unpaid');

  // Y el pescado vuelve al mostrador.
  expect(await stockOf(product.id)).toBe(before);
});

/** Espera a que el barrido o el webhook muevan el pedido. */
async function waitForOrderStatus(token: string, expected: string) {
  const deadline = Date.now() + 30_000;
  let last;

  while (Date.now() < deadline) {
    last = await orderByToken(token);
    if (last.status === expected) return last;
    await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(
    `El pedido nunca llegó a "${expected}" (se quedó en "${last?.status}").`,
  );
}
