import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { render } from '@react-email/components';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { orders } from '@/db/schema/sales';

/**
 * El correo, armado desde un pedido **de verdad**.
 *
 * Las otras pruebas cubren la plantilla con datos fijos y el envío con
 * simulacros. Ninguna cubría el trozo del medio: leer el pedido escrito y
 * traducirlo a un correo. Es donde viven los errores que importan —un importe
 * que sale de la columna equivocada, una dirección a medias, un pedido sin
 * correo— y no se ven mirando la plantilla, porque la plantilla pinta
 * perfectamente lo que se le pase.
 *
 * Así que el pedido lo crea `checkout()`, el mismo caso de uso que corre en
 * producción, contra Postgres de verdad. Lo único simulado es Resend.
 */

const captured: { payload: Record<string, unknown> }[] = [];

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        captured.push({ payload });
        return { data: { id: 'em_prueba' }, error: null };
      },
    };
  },
}));

vi.mock('@/modules/payments/checkout', () => ({
  openCheckout: vi.fn(async () => ({
    checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_x',
    expiresAt: null,
  })),
  voidOpenAttempts: vi.fn(async () => {}),
}));

const { checkout } = await import('@/modules/storefront/checkout');
const { sendOrderConfirmation } = await import('./order-confirmed');

beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await resetDatabase();
  captured.length = 0;
  process.env.RESEND_API_KEY = 're_prueba';
  process.env.RESEND_EMAIL_DOMAIN = 'amoramar.mx';
  process.env.STOREFRONT_ALLOWED_ORIGINS = 'https://amoramar.mx';
});

afterAll(async () => {
  await closeDatabase();
});

async function seedProduct(name: string, priceCents: number, sku: string) {
  const db = await testDb();
  const [product] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO products (sku, name, slug, price_cents, unit_type, status)
      VALUES (${sku}, ${name}, ${sku.toLowerCase()}, ${priceCents}, 'piece', 'active')
      RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO inventory (product_id, on_hand, reserved) VALUES (${product.id}, 50, 0)
  `);

  return product.id;
}

/** Una zona que cobra $50, para que subtotal y total no coincidan. */
async function seedZone() {
  const db = await testDb();
  const [zone] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO delivery_zones (name, fee_cents, active, sort_order)
      VALUES ('Prueba Del Valle', 5000, true, 10)
      RETURNING id
    `)
  ).rows;

  await db.execute(sql`
    INSERT INTO delivery_zone_postal_codes (zone_id, postal_code)
    VALUES (${zone.id}, '66220')
  `);
}

/** Crea un pedido con el caso de uso real y devuelve su id. */
async function realOrder(over: Record<string, unknown> = {}) {
  const atun = await seedProduct('Filete Aleta Azul', 150_000, 'ATU-1K');
  const almeja = await seedProduct('Almeja Chione', 14_500, 'ALM-1K');

  const created = await checkout({
    customer: { name: 'Ana Torres', phone: '8112345678', email: 'ana@example.com' },
    fulfillmentType: 'pickup',
    paymentMode: 'online',
    lines: [
      { productId: atun, quantity: 2 },
      { productId: almeja, quantity: 1 },
    ],
    returnUrls: {
      success: 'https://amoramar.mx/pedido/{TOKEN}',
      cancel: 'https://amoramar.mx/checkout',
    },
    ...over,
  } as Parameters<typeof checkout>[0]);

  const db = await testDb();
  const [row] = await db
    .select({ id: orders.id, number: orders.orderNumber })
    .from(orders)
    .where(eq(orders.publicToken, created.token));

  return { id: row.id, number: row.number, token: created.token };
}

/** El HTML que se habría enviado. */
async function sentHtml() {
  return render(captured[0].payload.react as React.ReactElement);
}

describe('los datos que viajan en el correo', () => {
  it('son los del pedido, no los de la plantilla', async () => {
    const order = await realOrder();

    const result = await sendOrderConfirmation(order.id);
    expect(result.sent).toBe(true);

    const html = await sentHtml();

    // Nombres y cantidades de las líneas realmente guardadas.
    expect(html).toContain('Filete Aleta Azul');
    expect(html).toContain('Almeja Chione');
    // 2 × $1,500 = $3,000 y 1 × $145. Los toma de `order_items`, que es la
    // instantánea del precio en el momento de la venta.
    expect(html).toContain('$3,000.00');
    expect(html).toContain('$145.00');
    // Total: el de la columna del pedido, el mismo que se cobró.
    expect(html).toContain('$3,145.00');
  });

  it('el asunto y el destinatario salen del pedido', async () => {
    const order = await realOrder();
    await sendOrderConfirmation(order.id);

    expect(captured[0].payload.to).toEqual(['ana@example.com']);
    expect(captured[0].payload.subject).toContain(`#${order.number}`);
  });

  it('enlaza al pedido por su token real', async () => {
    const order = await realOrder();
    await sendOrderConfirmation(order.id);

    expect(await sentHtml()).toContain(`/pedido/${order.token}`);
  });
});

describe('un pedido a domicilio', () => {
  /*
   * Esta suite existe por un fallo de la anterior.
   *
   * Con un pedido para recoger, `subtotalCents` y `totalCents` valen lo mismo
   * —no hay envío— así que la aserción del total pasaba igual leyendo la
   * columna equivocada. Se comprobó por mutación: cambiar `order.totalCents`
   * por `order.subtotalCents` **no rompía ninguna prueba**.
   *
   * Con envío las dos cifras difieren, y entonces la aserción discrimina.
   */
  it('cobra el envío y el total NO es el subtotal', async () => {
    await seedZone();

    const order = await realOrder({
      fulfillmentType: 'delivery',
      deliveryAddress: {
        street: 'Río Nazas',
        extNumber: '120',
        intNumber: null,
        neighborhood: 'Del Valle',
        city: 'San Pedro Garza García',
        state: 'Nuevo León',
        postalCode: '66220',
        references: null,
      },
    });

    await sendOrderConfirmation(order.id);
    const html = await sentHtml();

    expect(html).toContain('$3,145.00'); // subtotal
    expect(html).toContain('$50.00');    // envío
    expect(html).toContain('$3,195.00'); // total, distinto del subtotal
  });

  it('enseña la dirección del cliente, no la de la tienda', async () => {
    await seedZone();

    const order = await realOrder({
      fulfillmentType: 'delivery',
      deliveryAddress: {
        street: 'Río Nazas',
        extNumber: '120',
        intNumber: '4',
        neighborhood: 'Del Valle',
        city: 'San Pedro Garza García',
        state: 'Nuevo León',
        postalCode: '66220',
        references: null,
      },
    });

    await sendOrderConfirmation(order.id);
    const html = await sentHtml();

    expect(html).toContain('Río Nazas 120 int. 4');
    expect(html).toContain('Del Valle');
    expect(html).toContain('C.P. 66220');
    expect(html).toContain('Entrega a domicilio');
    // La del mostrador sólo aparece en el pie, no como destino.
    expect(html).not.toContain('Recoges en la tienda');
  });
});

describe('cuando falta algo', () => {
  it('un pedido inexistente no lanza, lo dice', async () => {
    const result = await sendOrderConfirmation(
      '00000000-0000-4000-8000-000000000000',
    );

    expect(result).toEqual({ sent: false, reason: 'El pedido no existe.' });
    expect(captured).toHaveLength(0);
  });

  it('sin correo del cliente no se manda nada', async () => {
    /*
     * Pasa de verdad: el mostrador levanta pedidos por teléfono y
     * `customerSchema` acepta el correo nulo a propósito. No es un error, es
     * un pedido que no lleva a quién escribirle.
     */
    const order = await realOrder();
    const db = await testDb();
    await db
      .update(orders)
      .set({ customerEmail: null })
      .where(eq(orders.id, order.id));

    const result = await sendOrderConfirmation(order.id);

    expect(result.sent).toBe(false);
    expect(captured).toHaveLength(0);
  });

  it('sin origen de tienda configurado no inventa un enlace', async () => {
    // Un correo con un enlace a `undefined/pedido/…` es peor que no enviarlo:
    // el cliente hace clic y aterriza en nada.
    delete process.env.STOREFRONT_ALLOWED_ORIGINS;
    const order = await realOrder();

    const result = await sendOrderConfirmation(order.id);

    expect(result.sent).toBe(false);
    expect(captured).toHaveLength(0);
  });
});
