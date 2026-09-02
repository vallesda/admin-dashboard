import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';

import { testDb, resetDatabase, closeDatabase } from '@/test/db';
import { initTestDb } from '@/test/db-alias';

/**
 * Apagar la página de cobro de un pedido que se canceló (matriz #18).
 *
 * El caso que importa es el común y el que estaba roto: una sesión que el
 * comprador **nunca abrió**. Esa sesión no tiene `payment_intent` —verificado
 * contra Stripe—, así que cancelar el intent no hacía nada y el enlace seguía
 * cobrando 24 h sobre un pedido cancelado cuyo pescado ya se había devuelto a
 * la venta. Alguien podía pagar por algo que ya no existía.
 */
const expireSession = vi.fn(async () => {});
const cancelIntent = vi.fn(async () => {});
const retrieveSession = vi.fn();

vi.mock('./stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./stripe')>();
  return { ...actual, expireSession, cancelIntent, retrieveSession };
});

const { voidOpenAttempts } = await import('./checkout');
const { recordPayment } = await import('./service');

beforeAll(async () => {
  await initTestDb();
  process.env.STRIPE_SECRET_KEY ||= 'sk_test_relleno';
});

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

afterAll(async () => {
  await closeDatabase();
});

async function orderWithOpenAttempt() {
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
      VALUES (${customer.id}, 'Ana', '8112345678', 'pending',
              'pickup', 50000, 50000, 'online')
      RETURNING id
    `)
  ).rows;

  await recordPayment({
    orderId: order.id,
    provider: 'stripe',
    status: 'created',
    amountCents: 50_000,
    actorId: null,
    stripe: { sessionId: 'cs_test_abierta' },
  });

  return order.id;
}

describe('voidOpenAttempts', () => {
  it('vence la sesión que nadie llegó a abrir', async () => {
    const orderId = await orderWithOpenAttempt();
    retrieveSession.mockResolvedValue({
      id: 'cs_test_abierta',
      status: 'open',
      payment_status: 'unpaid',
      // Lo esencial del caso: sin intent, porque nadie abrió la página.
      payment_intent: null,
    });

    await voidOpenAttempts(orderId);

    expect(expireSession).toHaveBeenCalledWith('cs_test_abierta');
  });

  it('cancela el intent del vale de OXXO, que no se puede vencer', async () => {
    // Sesión `complete` y aun así impaga: el vale emitido. Stripe no deja
    // vencerla, y lo que queda vivo es el intent.
    const orderId = await orderWithOpenAttempt();
    retrieveSession.mockResolvedValue({
      id: 'cs_test_abierta',
      status: 'complete',
      payment_status: 'unpaid',
      payment_intent: { id: 'pi_vale', status: 'requires_action' },
    });

    await voidOpenAttempts(orderId);

    expect(expireSession).not.toHaveBeenCalled();
    expect(cancelIntent).toHaveBeenCalledWith('pi_vale');
  });

  it('no toca una sesión ya pagada', async () => {
    /*
     * La carrera que importa: el comprador pagó en los segundos anteriores a
     * que corriera el barrido. Vencer o cancelar ahí sería quitarle a alguien
     * un pedido que sí pagó.
     */
    const orderId = await orderWithOpenAttempt();
    retrieveSession.mockResolvedValue({
      id: 'cs_test_abierta',
      status: 'complete',
      payment_status: 'paid',
      payment_intent: { id: 'pi_pagado', status: 'succeeded' },
    });

    await voidOpenAttempts(orderId);

    expect(expireSession).not.toHaveBeenCalled();
    expect(cancelIntent).not.toHaveBeenCalled();
  });
});
