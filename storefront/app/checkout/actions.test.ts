import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La acción que crea el pedido.
 *
 * Es la frontera con el servidor y lo que se protege aquí es lo que **no** se
 * confía al navegador: los precios, el modo de pago y las URLs de retorno. Un
 * cliente puede editar cualquier campo del formulario antes de enviarlo; estas
 * comprobaciones son las que cuentan, no las de la pantalla.
 */
const createOrder = vi.fn();
const redirect = vi.fn((url: string) => {
  // `redirect` funciona lanzando. Se imita porque el código real depende de eso:
  // hay un comentario explicando que se llama fuera del `try` justamente para
  // que un pedido correcto no se convierta en un mensaje de error.
  throw new Error(`REDIRECT:${url}`);
});

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/commerce', () => ({
  createOrder: (...args: unknown[]) => createOrder(...args),
  quoteDelivery: vi.fn(),
}));
vi.mock('@/lib/shop', () => ({ SITE_URL: 'https://amoramar.mx' }));

const { placeOrder } = await import('./actions');
const { EMPTY_STATE } = await import('./form-state');

beforeEach(() => {
  vi.clearAllMocks();
  createOrder.mockResolvedValue({
    token: 'tok-123',
    paymentMode: 'online',
    payment: { checkoutUrl: 'https://checkout.stripe.com/c/pay/x' },
  });
});

afterEach(() => vi.restoreAllMocks());

/** Un pedido de recoger, con lo mínimo válido. */
function form(over: Record<string, string> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    lines: JSON.stringify([{ productId: 'p1', quantity: 2 }]),
    name: 'Ana López',
    phone: '8112345678',
    // Obligatorio desde que se cobra por adelantado: es donde llega el
    // comprobante, y lo que Stripe usa como `customer_email`.
    email: 'ana@example.com',
    fulfillmentType: 'pickup',
    ...over,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

/** Corre la acción y devuelve el estado, o la URL a la que redirigió. */
async function run(fd: FormData) {
  try {
    return { state: await placeOrder(EMPTY_STATE, fd), redirectedTo: null };
  } catch (e) {
    const m = /^REDIRECT:(.*)$/.exec((e as Error).message);
    if (!m) throw e;
    return { state: null, redirectedTo: m[1] };
  }
}

describe('lo que el navegador no decide', () => {
  it('el pago siempre es en línea, aunque el formulario diga otra cosa', async () => {
    // El campo se retiró de la pantalla, pero nada impide reponerlo a mano
    // antes de enviar. La regla vive aquí precisamente por eso.
    await run(form({ paymentMode: 'on_site' }));

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMode: 'online' }),
    );
  });

  it('sólo manda identificadores y cantidades, nunca precios', async () => {
    const fd = form({
      lines: JSON.stringify([{ productId: 'p1', quantity: 2, unitPriceCents: 1 }]),
    });

    await run(fd);

    expect(createOrder.mock.calls[0][0].lines).toEqual([
      { productId: 'p1', quantity: 2 },
    ]);
  });

  it('descarta una línea con forma inservible', async () => {
    const fd = form({
      lines: JSON.stringify([
        { productId: 'p1', quantity: 2 },
        { productId: '', quantity: 5 },
        { productId: 'p3', quantity: 0 },
        { productId: 'p4', quantity: 1.5 },
      ]),
    });

    await run(fd);

    expect(createOrder.mock.calls[0][0].lines).toEqual([
      { productId: 'p1', quantity: 2 },
    ]);
  });

  it('las URLs de retorno salen del entorno, no de la petición', async () => {
    // Si salieran del request, un despliegue de preview podría convencer al
    // panel de rebotar clientes a otro dominio.
    await run(form());

    expect(createOrder.mock.calls[0][0].returnUrls).toEqual({
      success: 'https://amoramar.mx/pedido/{TOKEN}',
      cancel: 'https://amoramar.mx/checkout?cancelado=1',
    });
  });
});

describe('lo que se le pide al cliente', () => {
  it('exige nombre y teléfono', async () => {
    const { state } = await run(form({ name: '', phone: '' }));

    expect(state?.fieldErrors.name).toBeTruthy();
    expect(state?.fieldErrors.phone).toBeTruthy();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('exige el correo, que antes era opcional', async () => {
    /*
     * Cambió con el cobro por adelantado. Sin correo el comprador se queda sin
     * el comprobante de Stripe y sin nada escrito que pruebe lo que pagó: el
     * único rastro sería una llamada.
     */
    const { state } = await run(form({ email: '' }));

    expect(state?.fieldErrors.email).toBe(
      'Escribe tu correo: ahí te llega el comprobante.',
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rechaza un correo con forma inservible', async () => {
    const { state } = await run(form({ email: 'ana@' }));

    expect(state?.fieldErrors.email).toBe('Ese correo no parece válido.');
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('el correo llega al pedido, no se pierde por el camino', async () => {
    // Es lo que acaba en `customer_email` de la sesión de Checkout.
    await run(form());

    expect(vi.mocked(createOrder).mock.calls[0][0]).toMatchObject({
      customer: expect.objectContaining({ email: 'ana@example.com' }),
    });
  });

  it('a domicilio exige la dirección completa', async () => {
    const { state } = await run(form({ fulfillmentType: 'delivery' }));

    for (const campo of ['street', 'extNumber', 'neighborhood', 'city', 'postalCode']) {
      expect(state?.fieldErrors[campo], campo).toBeTruthy();
    }
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('recoger en tienda no pide dirección', async () => {
    await run(form());

    expect(createOrder).toHaveBeenCalledOnce();
    expect(createOrder.mock.calls[0][0].deliveryAddress).toBeUndefined();
  });

  it('el código postal son cinco dígitos, no «más o menos»', async () => {
    const { state } = await run(
      form({
        fulfillmentType: 'delivery',
        street: 'Río Bravo',
        extNumber: '120',
        neighborhood: 'Del Valle',
        city: 'San Pedro Garza García',
        state: 'Nuevo León',
        postalCode: '664',
      }),
    );

    expect(state?.fieldErrors.postalCode).toMatch(/5 dígitos/);
  });

  it('un carrito vacío no llega a crear pedido', async () => {
    const { state } = await run(form({ lines: '[]' }));

    expect(createOrder).not.toHaveBeenCalled();
    expect(state?.error ?? Object.keys(state?.fieldErrors ?? {}).length).toBeTruthy();
  });
});

describe('a dónde va después', () => {
  it('a pagar, cuando el cobro abrió', async () => {
    const { redirectedTo } = await run(form());

    expect(redirectedTo).toBe('https://checkout.stripe.com/c/pay/x');
  });

  it('a la confirmación, cuando no hay página de pago', async () => {
    createOrder.mockResolvedValue({
      token: 'tok-123',
      paymentMode: 'online',
      payment: { checkoutUrl: null },
    });

    const { redirectedTo } = await run(form());

    expect(redirectedTo).toBe('/pedido/tok-123');
  });
});

describe('cuando el panel dice que no', () => {
  it('un 422 se le muestra al cliente tal cual', async () => {
    // Son mensajes escritos para él: «sólo quedan 8 disponibles».
    const { CommerceError } = await import('@/lib/commerce/api-client');
    createOrder.mockRejectedValue(
      new CommerceError('out_of_stock', 'Sólo quedan 8 disponibles.', 422),
    );

    const { state } = await run(form());

    expect(state?.error).toBe('Sólo quedan 8 disponibles.');
  });

  it('cualquier otro fallo se asume nuestro y no culpa al cliente', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createOrder.mockRejectedValue(new Error('el panel se cayó'));

    const { state } = await run(form());

    expect(state?.error).toMatch(/carrito sigue intacto/i);
  });
});
