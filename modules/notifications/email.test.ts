import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

/**
 * El envío, con las dos trampas del SDK de Resend.
 *
 * La primera es que **no lanza excepciones**: devuelve `{ data, error }`. Un
 * `try/catch` alrededor no atrapa un 403 por dominio sin verificar ni un 429
 * por límite de tasa, así que da la falsa sensación de estar manejando fallos
 * cuando no se maneja ninguno.
 *
 * La segunda es la clave de idempotencia. Es lo único que impide que el
 * comprador reciba el mismo correo dos veces, porque quien confirma un pedido
 * corre dos veces por diseño.
 */

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  process.env.RESEND_API_KEY = 're_prueba';
  process.env.RESEND_EMAIL_DOMAIN = 'amoramar.mx';
  process.env.STOREFRONT_ALLOWED_ORIGINS = 'https://amoramar.mx';
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

async function mod() {
  return import('./email');
}

const args = {
  to: 'ana@example.com',
  subject: 'Prueba',
  react: createElement('p', null, 'hola'),
  idempotencyKey: 'pedido-confirmado/abc',
};

describe('cuando no hay proveedor configurado', () => {
  it('no lanza: dice que no se envió y por qué', async () => {
    // Un pedido pagado no puede fallar porque falte una variable de entorno.
    delete process.env.RESEND_API_KEY;
    const { send } = await mod();

    const result = await send(args);

    expect(result.sent).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('cuando Resend devuelve un error', () => {
  it('lo convierte en un resultado, no en una excepción', async () => {
    /*
     * El caso real del día de la apertura: el dominio todavía sin registros
     * DNS devuelve 403. Si esto lanzara, el webhook respondería 500 y Stripe
     * reintentaría la confirmación de un pago que sí entró.
     */
    sendMock.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Domain is not verified.' },
    });

    const { send } = await mod();
    const result = await send(args);

    expect(result.sent).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringMatching(/not verified/i) });
  });
});

describe('la clave de idempotencia', () => {
  it('viaja en cada envío', async () => {
    // Sin ella, las dos llamadas a `fulfillCheckout` mandan dos correos.
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    const { send } = await mod();
    await send(args);

    expect(sendMock.mock.calls[0][1]).toEqual({
      idempotencyKey: 'pedido-confirmado/abc',
    });
  });
});

describe('el remitente', () => {
  it('sale del dominio que provisionó la integración', async () => {
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    const { send } = await mod();
    await send(args);

    expect(sendMock.mock.calls[0][0].from).toBe('Amor a Mar <pedidos@amoramar.mx>');
  });

  it('cae al remitente de pruebas si el dominio no está puesto', async () => {
    // Mientras el DNS no esté, esto permite ver el correo en la bandeja propia
    // en vez de no poder enviar nada.
    delete process.env.RESEND_EMAIL_DOMAIN;
    sendMock.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    const { send } = await mod();
    await send(args);

    expect(sendMock.mock.calls[0][0].from).toContain('resend.dev');
  });
});
