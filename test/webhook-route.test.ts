/**
 * La ruta del webhook, ejercitada de verdad.
 *
 * `DOCS/PAGOS-VERIFICACION.md` §3 dice que la verificación de firma **en la
 * ruta** se ha ejecutado exactamente cero veces, y §7 nombra el escenario 11
 * —fallo a mitad del manejador— como el que más preocupa: si liberar el evento
 * estuviera mal, un error transitorio se convertiría en un pago perdido en
 * silencio.
 *
 * Estas filas de la matriz (7, 9, 11) no necesitan cuenta de Stripe: la firma
 * es un HMAC y se calcula igual aquí que allá. Lo que sí necesitan es Postgres
 * real, porque el `ON CONFLICT DO NOTHING` que deduplica es la mitad del
 * mecanismo — y contra un mock probaríamos el mock.
 */
import { createHmac } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { closeDatabase, resetDatabase } from './db';
import { initTestDb } from './db-alias';

const WEBHOOK_SECRET = 'whsec_pruebaslocalesnoesunsecretoreal';

/**
 * Lo que `headers()` devolverá dentro de la ruta.
 *
 * `next/headers` sólo funciona dentro del ciclo de petición de Next, así que se
 * sustituye por las cabeceras de la petición que estamos mandando. Es la única
 * pieza simulada del archivo: todo lo demás —firma, base, deduplicación— es
 * el código real.
 */
let currentHeaders = new Headers();

vi.mock('next/headers', () => ({
  headers: async () => currentHeaders,
}));

/** El único punto simulado del dominio, para poder provocar el fallo del #11. */
const handleEvent = vi.fn(async () => {});

vi.mock('@/modules/payments/webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/payments/webhook')>();
  return { ...actual, handleEvent };
});

/**
 * Firma un cuerpo como lo hace Stripe.
 *
 * `t=<epoch>,v1=<hmac-sha256(t + "." + payload)>`. Escrito a mano a propósito:
 * usar el ayudante del SDK para firmar y verificar probaría que el SDK es
 * consistente consigo mismo, no que la ruta rechaza lo que debe rechazar.
 */
function sign(payload: string, secret = WEBHOOK_SECRET, at = Date.now()): string {
  const t = Math.floor(at / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

function eventBody(id: string, type = 'checkout.session.completed'): string {
  return JSON.stringify({
    id,
    object: 'event',
    type,
    api_version: '2026-08-26.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_x', object: 'checkout.session' } },
  });
}

async function post(body: string, signature?: string): Promise<Response> {
  currentHeaders = new Headers(signature ? { 'stripe-signature': signature } : {});
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  return POST(new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
  }));
}

async function eventRows() {
  const { db } = await import('@/db');
  const { stripeEvents } = await import('@/db/schema/payments');
  return db.select().from(stripeEvents);
}

beforeAll(async () => {
  await initTestDb();
});

beforeEach(async () => {
  await resetDatabase();
  handleEvent.mockClear();
  handleEvent.mockImplementation(async () => {});
  process.env.STRIPE_SECRET_KEY = 'sk_test_llavefalsaparafirmarhmaclocal';
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await closeDatabase();
});

describe('POST /api/webhooks/stripe — configuración', () => {
  it('pide reintento, no rechaza, cuando falta la llave de Stripe', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const res = await post(eventBody('evt_1'), sign(eventBody('evt_1')));

    expect(res.status).toBe(503);
  });

  it('pide reintento cuando falta el secreto de firma', async () => {
    /*
     * La regresión que esto ancla: verificar contra `''` lanzaba y caía en el
     * 400 de abajo, y un 400 le dice a Stripe que el evento se rechazó por su
     * contenido — no se reintenta nunca. Un despliegue a medio configurar
     * perdía en silencio todos los pagos de esa ventana.
     */
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const res = await post(eventBody('evt_1'), sign(eventBody('evt_1')));

    expect(res.status).toBe(503);
    expect(await eventRows()).toHaveLength(0);
  });
});

describe('POST /api/webhooks/stripe — firma (matriz #9)', () => {
  it('rechaza una petición sin cabecera de firma', async () => {
    const res = await post(eventBody('evt_1'));

    expect(res.status).toBe(400);
    expect(await eventRows()).toHaveLength(0);
  });

  it('rechaza una firma basura sin escribir nada', async () => {
    const res = await post(eventBody('evt_1'), 't=1,v1=basura');

    expect(res.status).toBe(400);
    expect(handleEvent).not.toHaveBeenCalled();
    expect(await eventRows()).toHaveLength(0);
  });

  it('rechaza un cuerpo alterado después de firmarlo', async () => {
    // El ataque real: firma legítima de un evento de $10, cuerpo cambiado a
    // $10 000. El HMAC cubre el cuerpo exacto, así que no cuadra.
    const original = eventBody('evt_1');
    const signature = sign(original);

    const res = await post(original.replace('cs_test_x', 'cs_test_y'), signature);

    expect(res.status).toBe(400);
    expect(await eventRows()).toHaveLength(0);
  });

  it('rechaza una firma hecha con otro secreto', async () => {
    const body = eventBody('evt_1');

    const res = await post(body, sign(body, 'whsec_otrosecretodistinto'));

    expect(res.status).toBe(400);
  });

  it('rechaza un replay viejo', async () => {
    // Stripe tolera 5 minutos por defecto. Una hora es un replay.
    const body = eventBody('evt_1');

    const res = await post(body, sign(body, WEBHOOK_SECRET, Date.now() - 3600_000));

    expect(res.status).toBe(400);
  });
});

describe('POST /api/webhooks/stripe — deduplicación (matriz #7)', () => {
  it('procesa un evento nuevo y lo deja registrado', async () => {
    const body = eventBody('evt_nuevo');

    const res = await post(body, sign(body));

    expect(res.status).toBe(200);
    expect(handleEvent).toHaveBeenCalledTimes(1);

    const rows = await eventRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('evt_nuevo');
    expect(rows[0].type).toBe('checkout.session.completed');
  });

  it('no vuelve a procesar el mismo evento reentregado', async () => {
    const body = eventBody('evt_repetido');

    const first = await post(body, sign(body));
    const second = await post(body, sign(body));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });

    // Lo que de verdad importa: el pedido se confirma una vez, no dos.
    expect(handleEvent).toHaveBeenCalledTimes(1);
    expect(await eventRows()).toHaveLength(1);
  });
});

describe('POST /api/webhooks/stripe — fallo a mitad del manejador (matriz #11)', () => {
  it('libera el evento para que el reintento de Stripe sí trabaje', async () => {
    /*
     * El escenario que la auditoría marcó como el más peligroso. Si el evento
     * quedara reclamado tras fallar, el reintento lo vería como duplicado,
     * respondería 200 y el pago se perdería sin que nadie viera un error.
     */
    const body = eventBody('evt_transitorio');
    handleEvent.mockRejectedValueOnce(new Error('conexión perdida'));

    const failed = await post(body, sign(body));

    expect(failed.status).toBe(500);
    expect(await eventRows()).toHaveLength(0);

    // El reintento de Stripe, ya con la base sana.
    const retried = await post(body, sign(body));

    expect(retried.status).toBe(200);
    expect(handleEvent).toHaveBeenCalledTimes(2);
    expect(await eventRows()).toHaveLength(1);
  });
});
