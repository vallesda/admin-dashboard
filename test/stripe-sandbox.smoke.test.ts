/**
 * La primera vez que este código habla con Stripe.
 *
 * `DOCS/PAGOS-VERIFICACION.md` §3: `createCheckoutSession` y `retrieveSession`
 * llevaban **0 ejecuciones**. Esto las ejercita contra una cuenta sandbox real.
 *
 * ## Por qué está apagado por defecto
 *
 * Necesita red y una llave. CI corre sin ninguna de las dos y debe seguir
 * pasando, así que la suite se salta este archivo salvo que se pida:
 *
 * ```bash
 * STRIPE_SMOKE=1 pnpm test test/stripe-sandbox.smoke.test.ts
 * ```
 *
 * ## Por qué es un archivo de pruebas y no un script suelto
 *
 * Un script se corre una vez, se cree y se borra. La matriz del paso 3 hay que
 * poder repetirla cada vez que alguien toque `stripe.ts` — que es exactamente
 * lo que acaba de pasar con los métodos de pago.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Carga `.env.local` a mano.
 *
 * Vitest no lee archivos de entorno, y meter `dotenv` como dependencia para
 * esto sería pagar un paquete por seis líneas. Sólo rellena lo que falte: una
 * variable ya exportada en la terminal gana, que es lo que uno espera.
 */
function loadEnvLocal(): void {
  let contents: string;

  try {
    contents = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, raw] = match;
    // Las comillas son del archivo, no del valor: `sk_test_…` entre comillas
    // llegaría a Stripe con ellas y daría un 401 desconcertante.
    const value = raw.trim().replace(/^["']|["']$/g, '');
    if (value && !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const enabled = process.env.STRIPE_SMOKE === '1' && Boolean(process.env.STRIPE_SECRET_KEY);

const ORIGIN = 'http://localhost:3001';

/** Un pedido plausible: dos líneas y envío, como los que crea la tienda. */
function args(orderId: string) {
  return {
    orderId,
    orderNumber: 4242,
    publicToken: 'tok_smoke_amoramar',
    lines: [
      { name: 'Camarón mediano (kg)', unitPriceCents: 32_000, quantity: 2 },
      { name: 'Filete de huachinango (kg)', unitPriceCents: 28_500, quantity: 1 },
    ],
    deliveryFeeCents: 6_000,
    customerEmail: 'cliente@example.com',
    successUrl: `${ORIGIN}/pedido/tok_smoke_amoramar`,
    cancelUrl: `${ORIGIN}/checkout`,
  };
}

/** 32 000×2 + 28 500 + 6 000 de envío. Lo calculamos aquí para compararlo. */
const TOTAL_CENTS = 32_000 * 2 + 28_500 + 6_000;

describe.skipIf(!enabled)('Checkout Session contra el sandbox', () => {
  let mod: typeof import('@/modules/payments/stripe');

  beforeAll(async () => {
    process.env.STOREFRONT_ALLOWED_ORIGINS = ORIGIN;
    mod = await import('@/modules/payments/stripe');
  });

  it('abre una sesión y Stripe acepta los parámetros nuevos', async () => {
    const session = await mod.createCheckoutSession(args(`smoke-${Date.now()}`));

    expect(session.url).toMatch(/^https:\/\//);
    expect(session.currency).toBe('mxn');
    expect(session.status).toBe('open');
    expect(session.payment_status).toBe('unpaid');
  });

  it('cobra exactamente el total del pedido, envío incluido', async () => {
    // La regla de oro de la conciliación: si esto no cuadra, el libro y Stripe
    // cuentan historias distintas y no hay forma de saber cuál miente.
    const session = await mod.createCheckoutSession(args(`smoke-total-${Date.now()}`));

    expect(session.amount_total).toBe(TOTAL_CENTS);
  });

  it('la exclusión tiene efecto real sobre lo que Stripe ofrece', async () => {
    /*
     * La prueba con dientes, y la razón por la que no basta con mirar la sesión
     * que crea nuestro código.
     *
     * En esta cuenta OXXO y SPEI están en `available: false`, así que afirmar
     * «la sesión no ofrece OXXO» pasaría **igual sin la exclusión**: una prueba
     * verde que no prueba nada, que es justo lo que `DT-008` describe.
     *
     * Así que se comprueba el mecanismo con el único método excluible que esta
     * cuenta sí ofrece —`card`— y se mira que Stripe lo quite de verdad: al
     * quitarlo no queda ninguno y la creación falla. Si `excluded_payment_method_types`
     * se ignorara, la sesión se habría creado tan campante.
     */
    const { stripe } = await import('@/lib/stripe');

    await expect(
      stripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: 1_000,
            product_data: { name: 'control' },
          },
        }],
        success_url: `${ORIGIN}/ok`,
        excluded_payment_method_types: ['card'],
      }),
    ).rejects.toThrow(/No valid payment method types/i);
  });

  it('no ofrece métodos de notificación diferida', async () => {
    /*
     * La propiedad que le importa a la tienda. Hoy se cumple por dos motivos a
     * la vez —la exclusión del código y que la cuenta aún no tiene OXXO
     * disponible— y por eso la prueba de arriba existe: separa el mecanismo de
     * la configuración.
     *
     * El día que la cuenta se active y OXXO pase a `available`, esta prueba se
     * vuelve la que avisa si alguien quita la exclusión, antes de que un vale
     * congele un kilo de pescado tres días.
     */
    const session = await mod.createCheckoutSession(args(`smoke-pm-${Date.now()}`));

    expect(session.payment_method_types).not.toContain('oxxo');
    expect(session.payment_method_types).not.toContain('customer_balance');
    expect(session.payment_method_types).toContain('card');
  });

  it('etiqueta la sesión con el identificador de integración', async () => {
    const session = await mod.createCheckoutSession(args(`smoke-id-${Date.now()}`));

    expect(session.integration_identifier).toBe(mod.INTEGRATION_IDENTIFIER);
  });

  it('lleva el pedido en metadata y en client_reference_id', async () => {
    // Es lo único que ata un pago de Stripe a un pedido nuestro. Sin esto, un
    // reembolso hecho desde el Dashboard no se puede rastrear.
    const orderId = `smoke-meta-${Date.now()}`;
    const session = await mod.createCheckoutSession(args(orderId));

    expect(session.client_reference_id).toBe(orderId);
    expect(session.metadata).toMatchObject({
      orderId,
      orderNumber: '4242',
      publicToken: 'tok_smoke_amoramar',
    });
  });

  it('devuelve la misma sesión ante un doble clic en «Pagar» (matriz #5)', async () => {
    // La clave de idempotencia es `order:<id>:session`. Dos sesiones vivas para
    // un pedido son dos formas de pagarlo.
    const orderId = `smoke-idem-${Date.now()}`;

    const first = await mod.createCheckoutSession(args(orderId));
    const second = await mod.createCheckoutSession(args(orderId));

    expect(second.id).toBe(first.id);
  });

  it('rechaza una URL de retorno de otro origen', async () => {
    // Sin esto Stripe rebotaría al comprador a donde diga el atacante, después
    // de pagar y con la marca de la tienda encima.
    await expect(
      mod.createCheckoutSession({
        ...args(`smoke-evil-${Date.now()}`),
        successUrl: 'https://amoramar.mx.evil.com/pedido/x',
      }),
    ).rejects.toThrow(/origen autorizado/);
  });

  it('relee la sesión con el intent expandido', async () => {
    const created = await mod.createCheckoutSession(args(`smoke-read-${Date.now()}`));
    const read = await mod.retrieveSession(created.id);

    expect(read.id).toBe(created.id);
    expect(read.amount_total).toBe(TOTAL_CENTS);
  });
});

/**
 * Cerrar la página de cobro de un pedido cancelado (matriz #18).
 *
 * Se descubrió aquí, contra Stripe: `voidOpenAttempts` cancelaba el
 * PaymentIntent, y una sesión que el comprador nunca abrió **no tiene**
 * PaymentIntent. No había nada que cancelar y el enlace seguía cobrando 24 h
 * sobre un pedido ya cancelado y con el pescado devuelto a la venta.
 */
describe.skipIf(!enabled)('cerrar la sesión de un pedido cancelado', () => {
  let mod: typeof import('@/modules/payments/stripe');

  beforeAll(async () => {
    process.env.STOREFRONT_ALLOWED_ORIGINS = ORIGIN;
    mod = await import('@/modules/payments/stripe');
  });

  it('una sesión recién creada todavía no tiene PaymentIntent', async () => {
    // La premisa del bug, fijada para que nadie «simplifique» el arreglo de
    // vuelta a cancelar sólo el intent.
    const session = await mod.createCheckoutSession(args(`smoke-void-a-${Date.now()}`));

    expect(session.status).toBe('open');
    expect(session.payment_intent).toBeNull();
  });

  it('vencerla deja el enlace inservible', async () => {
    const session = await mod.createCheckoutSession(args(`smoke-void-b-${Date.now()}`));

    await mod.expireSession(session.id);

    const after = await mod.retrieveSession(session.id);
    expect(after.status).toBe('expired');
    // Lo que de verdad importa: ya no se puede pagar.
    expect(after.payment_status).toBe('unpaid');
  });
});
