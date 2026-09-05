import { describe, expect, it } from 'vitest';
import { render } from '@react-email/components';
import { createElement } from 'react';

import OrderConfirmed, { type OrderConfirmedProps } from '@/emails/order-confirmed';

/**
 * La plantilla, renderizada a HTML de verdad.
 *
 * Lo que se protege no es el aspecto: es que el correo **siga siendo útil con
 * las imágenes bloqueadas**, que es como lo van a ver la mayoría —Gmail y
 * Outlook las bloquean por defecto— y que los importes que lee el cliente sean
 * los que se cobraron.
 */

const base: OrderConfirmedProps = {
  orderNumber: 61,
  customerName: 'Ana Torres',
  lines: [
    { name: 'Filete Aleta Azul', quantity: 2, lineTotalCents: 300_000 },
    { name: 'Almeja Chione', quantity: 1, lineTotalCents: 14_500 },
  ],
  subtotalCents: 314_500,
  deliveryFeeCents: 5_000,
  totalCents: 319_500,
  fulfillment: 'delivery',
  deliveryAddress: 'Río Nazas 120, Del Valle, San Pedro Garza García, N.L.',
  orderUrl: 'https://amoramar.mx/pedido/tok-123',
  assetsBaseUrl: 'https://amoramar.mx',
  shopAddress: 'Río Amazonas 132 Ote., Local 1A',
  whatsappUrl: 'https://wa.me/528129162142',
  whatsappLabel: '(81) 2916 2142',
};

const html = (over: Partial<OrderConfirmedProps> = {}) =>
  render(createElement(OrderConfirmed, { ...base, ...over }));

describe('el desglose', () => {
  it('nombra cada producto con su importe', async () => {
    const out = await html();

    expect(out).toContain('Filete Aleta Azul');
    expect(out).toContain('$3,000.00');
    expect(out).toContain('Almeja Chione');
    expect(out).toContain('$145.00');
  });

  it('enseña el envío cuando lo hay, y el total cobrado', async () => {
    const out = await html();

    expect(out).toContain('$50.00');
    expect(out).toContain('$3,195.00');
  });

  it('no inventa una línea de envío en un pedido para recoger', async () => {
    // Un «Envío $0.00» en un pedido que se recoge confunde: parece que hubo un
    // reparto gratis en vez de que no hubo reparto.
    const out = await html({ fulfillment: 'pickup', deliveryFeeCents: 0 });

    expect(out).not.toContain('Envío');
  });

  it('los importes son los que se le pasan, no recalculados', async () => {
    // Si esta plantilla sumara, podría discrepar de lo cobrado — y el cliente
    // cree lo que lee aquí.
    const out = await html({ totalCents: 999_99 });

    expect(out).toContain('$999.99');
  });
});

describe('cómo lo recibe', () => {
  it('a domicilio enseña la dirección del cliente', async () => {
    const out = await html();

    expect(out).toContain('Río Nazas 120');
    expect(out).toContain('Entrega a domicilio');
  });

  it('a recoger enseña la dirección de la tienda', async () => {
    const out = await html({ fulfillment: 'pickup', deliveryAddress: null });

    expect(out).toContain('Río Amazonas 132');
    expect(out).not.toContain('Río Nazas');
  });
});

describe('se lee sin imágenes', () => {
  it('el remitente se identifica en texto, no sólo con el ojo', async () => {
    /*
     * Gmail y Outlook bloquean las imágenes remotas por defecto. Si «Amor a
     * Mar» sólo estuviera en el logo, el correo llegaría sin remitente visible
     * y parecería suplantación.
     */
    const out = await html();
    const sinImagenes = out.replace(/<img[^>]*>/g, '');

    expect(sinImagenes).toContain('Amor a Mar');
    expect(sinImagenes).toContain('Tu pedido está confirmado');
    expect(sinImagenes).toContain('$3,195.00');
  });

  it('el ojo es decorativo, para que no se lea dos veces', async () => {
    // El nombre está al lado en texto; un `alt` con «logo» sólo repetiría.
    const out = await html();
    const img = /<img[^>]*ojoLogoAmorAMar[^>]*>/.exec(out)?.[0] ?? '';

    expect(img).toContain('alt=""');
  });

  it('el ojo cuelga de una URL absoluta', async () => {
    // Una ruta relativa no resuelve en un cliente de correo.
    const out = await html();

    expect(out).toContain('https://amoramar.mx/brand/ojoLogoAmorAMar.png');
  });
});

describe('qué se puede hacer desde el correo', () => {
  it('enlaza al pedido por su token, nunca por el número', async () => {
    // El número es consecutivo: enlazar por él dejaría ver pedidos ajenos
    // cambiando un dígito.
    const out = await html();

    expect(out).toContain('/pedido/tok-123');
    expect(out).not.toContain('/pedido/61');
  });

  it('deja escribir por WhatsApp', async () => {
    const out = await html();

    expect(out).toContain('wa.me/528129162142');
  });

  it('avisa de que el comprobante de Stripe llega aparte', async () => {
    // Con los dos correos activos, sin esta línea el segundo mensaje parece un
    // segundo cargo.
    const out = await html();

    expect(out).toMatch(/Stripe te env(í|i)a por separado/i);
  });
});

describe('la versión de texto plano', () => {
  it('lleva el desglose y el total', async () => {
    // Es la que ven los lectores de pantalla y los clientes que rechazan HTML.
    const text = await render(createElement(OrderConfirmed, base), {
      plainText: true,
    });

    expect(text).toContain('Filete Aleta Azul');
    expect(text).toContain('$3,195.00');
  });
});
