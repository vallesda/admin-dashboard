import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';

/**
 * Qué método de pago ve el comprador en su página de confirmación.
 *
 * Este archivo existe por un bug que **sólo apareció al pagar de verdad**. La
 * consulta leía el método desde `findOpenAttempt`, que sólo mira intentos en
 * `created`/`processing`; en cuanto el pago triunfaba, el intento pasaba a
 * `succeeded` y dejaba de encontrarse. Resultado: quien acababa de pagar con
 * tarjeta aterrizaba —desde el propio redirect de Stripe— en una página que no
 * decía cómo había pagado.
 *
 * Ninguna prueba lo atrapó porque todas las que tocaban este camino se
 * detenían antes de que un cobro llegara a liquidarse.
 */
vi.mock('@/modules/payments/checkout', () => ({
  openCheckout: vi.fn(async () => ({
    checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_x',
    expiresAt: null,
  })),
  voidOpenAttempts: vi.fn(async () => {}),
}));

const { checkout } = await import('./checkout');
const { getOrderByToken } = await import('./queries');
const { recordPayment } = await import('@/modules/payments/service');
const { orders } = await import('@/db/schema/sales');

beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

async function seedProduct() {
  const db = await testDb();

  const [product] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status)
      VALUES ('ATU-1K', 'Atún aleta amarilla', 'atun-aleta', 20000, 'piece', 'active')
      RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO inventory (product_id, on_hand, reserved)
    VALUES (${product.id}, 10, 0)
  `);

  return product.id;
}

/** `checkout` devuelve el token público, no el id interno que necesita el libro. */
async function orderIdOf(token: string): Promise<string> {
  const db = await testDb();
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.publicToken, token));
  return row.id;
}

async function onlineOrder() {
  const productId = await seedProduct();

  return checkout({
    customer: { name: 'Ana', phone: '8112345678', email: null },
    fulfillmentType: 'pickup',
    lines: [{ productId, quantity: 1 }],
    paymentMode: 'online',
    returnUrls: {
      success: 'https://tienda.mx/pedido/{TOKEN}',
      cancel: 'https://tienda.mx/checkout',
    },
  });
}

describe('getOrderByToken · el método de pago tras cobrar', () => {
  it('nombra la tarjeta cuando el cobro ya se liquidó', async () => {
    const created = await onlineOrder();

    // Lo que hace `fulfillCheckout` al llegar el webhook: el intento queda en
    // `succeeded`, que es justo el estado que `findOpenAttempt` no ve.
    await recordPayment({
      orderId: await orderIdOf(created.token),
      provider: 'stripe',
      status: 'succeeded',
      amountCents: 20_000,
      actorId: null,
      stripe: {
        sessionId: 'cs_test_x',
        paymentIntentId: 'pi_test_x',
        chargeId: 'ch_test_x',
        paymentMethodType: 'card',
      },
    });

    const order = await getOrderByToken(created.token);

    expect(order?.payment.methodLabel).toBe('Tarjeta');
  });

  it('sigue nombrando el vale mientras el cobro está abierto', async () => {
    // El respaldo que no hay que romper: un vale emitido tiene método antes de
    // que se haya pagado un peso.
    const created = await onlineOrder();

    await recordPayment({
      orderId: await orderIdOf(created.token),
      provider: 'stripe',
      status: 'processing',
      amountCents: 20_000,
      actorId: null,
      stripe: { sessionId: 'cs_test_y', paymentMethodType: 'oxxo' },
    });

    const order = await getOrderByToken(created.token);

    expect(order?.payment.methodLabel).toBe('OXXO');
  });

  it('nunca filtra el nombre del proveedor a la tienda', async () => {
    const created = await onlineOrder();
    const order = await getOrderByToken(created.token);

    expect(JSON.stringify(order)).not.toMatch(/stripe/i);
  });
});
