import { describe, expect, it } from 'vitest';

import { createOrderSchema } from './validators';

const address = {
  street: 'Río Guadalquivir',
  extNumber: '229',
  intNumber: null,
  neighborhood: 'Cuauhtémoc',
  city: 'Cuauhtémoc',
  state: 'Ciudad de México',
  postalCode: '06500',
  references: null,
};

const base = {
  customerId: '11111111-1111-4111-8111-111111111111',
  lines: [{ productId: '22222222-2222-4222-8222-222222222222', quantity: 1 }],
  notes: null,
};

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe('el efectivo sólo se cobra en el mostrador', () => {
  it('rechaza domicilio con pago al recibir', () => {
    // The one combination whose downside lands entirely on the shop: product on
    // a motorbike against a promise.
    const r = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: 'delivery',
      paymentMode: 'on_site',
      deliveryAddress: address,
    });

    expect(r.success).toBe(false);
    expect(messages(r).join(' ')).toContain('a domicilio se pagan en línea');
  });

  it('acepta domicilio pagado en línea', () => {
    expect(
      createOrderSchema.safeParse({
        ...base,
        fulfillmentType: 'delivery',
        paymentMode: 'online',
        deliveryAddress: address,
      }).success,
    ).toBe(true);
  });

  it('acepta recoger en tienda con cualquiera de los dos pagos', () => {
    for (const paymentMode of ['online', 'on_site'] as const) {
      expect(
        createOrderSchema.safeParse({
          ...base,
          fulfillmentType: 'pickup',
          paymentMode,
        }).success,
        paymentMode,
      ).toBe(true);
    }
  });

  it('el valor por omisión sigue siendo mostrador, y sigue siendo legal', () => {
    // Every order that already exists was taken at the counter. The default
    // must not turn those into something they were not.
    const r = createOrderSchema.safeParse({ ...base, fulfillmentType: 'pickup' });

    expect(r.success && r.data.paymentMode).toBe('on_site');
  });
});

describe('una entrega necesita dirección', () => {
  it('rechaza domicilio sin dirección', () => {
    const r = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: 'delivery',
      paymentMode: 'online',
    });

    expect(r.success).toBe(false);
    expect(messages(r).join(' ')).toContain('necesita dirección');
  });

  it('rechaza domicilio con dirección incompleta', () => {
    const r = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: 'delivery',
      paymentMode: 'online',
      deliveryAddress: { ...address, postalCode: '' },
    });

    expect(r.success).toBe(false);
  });

  it('no exige dirección para recoger en tienda', () => {
    expect(
      createOrderSchema.safeParse({ ...base, fulfillmentType: 'pickup' }).success,
    ).toBe(true);
  });
});

describe('las reglas que ya existían siguen valiendo', () => {
  it('rechaza un producto repetido en dos líneas', () => {
    const r = createOrderSchema.safeParse({
      ...base,
      fulfillmentType: 'pickup',
      lines: [
        { productId: '22222222-2222-4222-8222-222222222222', quantity: 1 },
        { productId: '22222222-2222-4222-8222-222222222222', quantity: 2 },
      ],
    });

    expect(r.success).toBe(false);
    expect(messages(r).join(' ')).toContain('repetido');
  });

  it('rechaza un pedido sin líneas', () => {
    expect(
      createOrderSchema.safeParse({ ...base, fulfillmentType: 'pickup', lines: [] })
        .success,
    ).toBe(false);
  });
});
