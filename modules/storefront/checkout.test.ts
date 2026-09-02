import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { inventory } from '@/db/schema/inventory';
import { orders } from '@/db/schema/sales';

/**
 * Qué pasa cuando el cobro no se puede abrir.
 *
 * La tienda cobra siempre por adelantado, así que un pedido sin pago no debe
 * existir. Lo que se comprueba aquí no es que se lance un error —eso es lo
 * fácil— sino que **el pescado vuelva al inventario**: `checkout` crea el
 * pedido y aparta stock *antes* de hablar con la pasarela, y ese orden es lo
 * que hace que este camino tenga algo que deshacer.
 *
 * Antes de este cambio, un fallo del proveedor dejaba el pedido en pie: a
 * domicilio pendiente de pago, y a recoger convertido en efectivo al mostrador
 * sin que el cliente lo eligiera. Las dos ramas apartaban producto que nadie
 * había pagado.
 */
vi.mock('@/modules/payments/checkout', () => ({
  openCheckout: vi.fn(),
  voidOpenAttempts: vi.fn(async () => {}),
}));

const { openCheckout } = await import('@/modules/payments/checkout');
const { checkout } = await import('./checkout');

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

async function seedProduct(onHand = 10) {
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
    VALUES (${product.id}, ${onHand}, 0)
  `);

  return product.id;
}

const input = (productId: string) => ({
  customer: { name: 'Ana', phone: '8112345678', email: null },
  fulfillmentType: 'pickup' as const,
  lines: [{ productId, quantity: 3 }],
  paymentMode: 'online' as const,
  returnUrls: { success: 'https://tienda.mx/pedido/{TOKEN}', cancel: 'https://tienda.mx/checkout' },
});

async function stockOf(productId: string) {
  const db = await testDb();
  const [row] = await db
    .select({ onHand: inventory.onHand, reserved: inventory.reserved })
    .from(inventory)
    .where(eq(inventory.productId, productId));
  return row;
}

describe('checkout · el cobro no se puede abrir', () => {
  it('no deja ningún pedido en pie', async () => {
    const productId = await seedProduct();
    vi.mocked(openCheckout).mockRejectedValue(new Error('Stripe caído'));

    await expect(checkout(input(productId))).rejects.toThrow(
      /no se generó tu pedido/i,
    );

    const db = await testDb();
    const rows = await db.select({ status: orders.status }).from(orders);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('cancelled');
  });

  it('devuelve el producto apartado al inventario', async () => {
    const productId = await seedProduct(10);
    vi.mocked(openCheckout).mockRejectedValue(new Error('Stripe caído'));

    await expect(checkout(input(productId))).rejects.toThrow();

    // Lo que importa: `reserved` vuelve a cero. Si esto falla, la tienda va
    // perdiendo existencia vendible con cada cobro que no abre.
    expect(await stockOf(productId)).toEqual({ onHand: 10, reserved: 0 });
  });

  it('anula el intento de cobro antes de cancelar', async () => {
    const productId = await seedProduct();
    const { voidOpenAttempts } = await import('@/modules/payments/checkout');
    vi.mocked(openCheckout).mockRejectedValue(new Error('Stripe caído'));

    await expect(checkout(input(productId))).rejects.toThrow();

    // Por si el cobro alcanzó a escribir un intento antes de fallar.
    expect(voidOpenAttempts).toHaveBeenCalledOnce();
  });

  it('cuando el cobro sí abre, el pedido vive y el stock queda apartado', async () => {
    const productId = await seedProduct(10);
    vi.mocked(openCheckout).mockResolvedValue({
      checkoutUrl: 'https://checkout.stripe.com/c/pay/x',
      expiresAt: null,
    });

    const result = await checkout(input(productId));

    expect(result.paymentMode).toBe('online');
    expect(await stockOf(productId)).toEqual({ onHand: 10, reserved: 3 });
  });
});
