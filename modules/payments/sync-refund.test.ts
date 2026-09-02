import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, eq } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';
import { refunds } from '@/db/schema/payments';

/**
 * Un reembolso del Dashboard llega por varios eventos a la vez.
 *
 * Stripe emite `refund.created` y `refund.updated` casi simultáneamente. Los
 * dos entran en `syncRefund`, los dos ven que no hay fila y los dos intentan
 * crearla: un comprobar-luego-actuar que ninguna comprobación previa cierra.
 *
 * Lo cierra la base, con `refunds_stripe_refund_id_unique`. Por eso el dinero
 * salía bien —un solo reembolso— pero el perdedor devolvía **500**, y Stripe
 * reintentaba un evento que ya no tenía nada que hacer.
 *
 * Observado cobrando de verdad: pedido #60, $300 devueltos correctamente y aun
 * así un 500 en `refund.created` (DOCS/PAGOS-VERIFICACION.md §3ter).
 */
vi.mock('@/modules/payments/service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/payments/service')>();
  return { ...actual, refundOrder: vi.fn(actual.refundOrder) };
});

const { syncRefund } = await import('./webhook');
const { recordPayment, refundOrder } = await import('./service');

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

const INTENT = 'pi_test_carrera';

/** Un pedido cobrado, que es la precondición de cualquier devolución. */
async function paidOrder() {
  const db = await testDb();

  const [customer] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO customers (name, phone) VALUES ('Ana', '8112345678') RETURNING id
    `)
  ).rows;

  const [order] = (
    await db.execute<{ id: string }>(sql`
      INSERT INTO orders (customer_id, customer_name, customer_phone, status,
                          fulfillment_type, subtotal_cents, total_cents, payment_mode)
      VALUES (${customer.id}, 'Ana', '8112345678', 'confirmed',
              'pickup', 150000, 150000, 'online')
      RETURNING id
    `)
  ).rows;

  await recordPayment({
    orderId: order.id,
    provider: 'stripe',
    status: 'succeeded',
    amountCents: 150_000,
    actorId: null,
    stripe: { sessionId: 'cs_test_x', paymentIntentId: INTENT, paymentMethodType: 'card' },
  });

  return order.id;
}

/** El reembolso tal y como lo describen ambos eventos. */
const stripeRefund = {
  id: 're_test_carrera',
  object: 'refund',
  amount: 30_000,
  status: 'succeeded',
  payment_intent: INTENT,
  failure_reason: null,
} as unknown as import('stripe').Stripe.Refund;

async function refundRows() {
  const db = await testDb();
  return db.select().from(refunds).where(eq(refunds.stripeRefundId, stripeRefund.id));
}

describe('syncRefund · dos eventos para un mismo reembolso', () => {
  it('registra el reembolso una sola vez', async () => {
    await paidOrder();

    await syncRefund(stripeRefund);
    await syncRefund(stripeRefund);

    const rows = await refundRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(30_000);
  });

  it('absorbe perder la carrera en vez de responder 500', async () => {
    /*
     * La carrera de verdad, reproducida: entre que `syncRefund` mira si la fila
     * existe y la crea, **otro evento la crea primero**. El mock hace justo eso
     * —escribe la fila y luego levanta la violación de unicidad, como haría
     * Postgres— y lo que se exige es que no se propague.
     */
    const orderId = await paidOrder();
    const real = (
      await vi.importActual<typeof import('./service')>('./service')
    ).refundOrder;

    vi.mocked(refundOrder).mockImplementationOnce(async (args) => {
      await real(args);
      throw Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'refunds_stripe_refund_id_unique',
      });
    });

    await expect(syncRefund(stripeRefund)).resolves.toBeUndefined();

    const rows = await refundRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].orderId).toBe(orderId);
    expect(rows[0].status).toBe('succeeded');
  });

  it('deja subir cualquier otro fallo, que sí merece reintento', async () => {
    // Absorber todo convertiría un fallo real en un 200 y el evento se perdería
    // para siempre: Stripe no reintenta lo que se acusó de recibido.
    await paidOrder();
    vi.mocked(refundOrder).mockRejectedValueOnce(new Error('conexión perdida'));

    await expect(syncRefund(stripeRefund)).rejects.toThrow(/conexión perdida/);
  });
});
