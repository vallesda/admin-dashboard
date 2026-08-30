import { describe, expect, it } from 'vitest';

import {
  deliveryAddressSchema,
  formatDeliveryAddress,
  toDeliveryColumns,
  MEXICAN_STATES,
} from './address';

const valid = {
  street: 'Río Guadalquivir',
  extNumber: '229',
  intNumber: '4B',
  neighborhood: 'Cuauhtémoc',
  city: 'Cuauhtémoc',
  state: 'Ciudad de México',
  postalCode: '06500',
  references: 'Portón azul, junto a la farmacia',
};

describe('deliveryAddressSchema', () => {
  it('acepta una dirección completa', () => {
    expect(deliveryAddressSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta sin interior ni referencias', () => {
    const r = deliveryAddressSchema.safeParse({
      ...valid,
      intNumber: '',
      references: '   ',
    });

    // Plenty of Mexican addresses have neither. Demanding them makes people
    // type "N/A", which is worse than a null.
    expect(r.success).toBe(true);
    expect(r.success && r.data.intNumber).toBeNull();
    expect(r.success && r.data.references).toBeNull();
  });

  it('exige calle, número, colonia, municipio y estado', () => {
    for (const field of ['street', 'extNumber', 'neighborhood', 'city'] as const) {
      const r = deliveryAddressSchema.safeParse({ ...valid, [field]: '  ' });
      expect(r.success, `${field} debería ser obligatorio`).toBe(false);
    }
  });

  describe('código postal', () => {
    it('acepta cinco dígitos, incluido uno que empieza con cero', () => {
      expect(
        deliveryAddressSchema.safeParse({ ...valid, postalCode: '06000' }).success,
      ).toBe(true);
    });

    it('rechaza cualquier otra cosa', () => {
      for (const bad of ['6000', '060000', 'CP0600', '06 00', '']) {
        expect(
          deliveryAddressSchema.safeParse({ ...valid, postalCode: bad }).success,
          `"${bad}" no debería pasar`,
        ).toBe(false);
      }
    });
  });

  describe('estado', () => {
    it('acepta los 32 nombres de INEGI', () => {
      for (const state of MEXICAN_STATES) {
        expect(
          deliveryAddressSchema.safeParse({ ...valid, state }).success,
          state,
        ).toBe(true);
      }
    });

    it('rechaza las variantes que serían el mismo lugar dos veces', () => {
      // The reason the list is closed: "CDMX", "D.F." and "Distrito Federal"
      // are one place, and four spellings make a delivery zone undefinable.
      for (const bad of ['CDMX', 'D.F.', 'Distrito Federal', 'Mexico City']) {
        expect(
          deliveryAddressSchema.safeParse({ ...valid, state: bad }).success,
          bad,
        ).toBe(false);
      }
    });
  });
});

describe('formatDeliveryAddress', () => {
  it('la escribe como se dicta', () => {
    expect(formatDeliveryAddress(deliveryAddressSchema.parse(valid))).toBe(
      'Río Guadalquivir 229, Int. 4B, Col. Cuauhtémoc, Cuauhtémoc, Ciudad de México, C.P. 06500 — Ref: Portón azul, junto a la farmacia',
    );
  });

  it('omite el interior cuando no lo hay', () => {
    const line = formatDeliveryAddress(
      deliveryAddressSchema.parse({ ...valid, intNumber: '' }),
    );

    expect(line).not.toContain('Int.');
    expect(line).toContain('Río Guadalquivir 229, Col. Cuauhtémoc');
  });

  it('omite las referencias cuando no las hay', () => {
    const line = formatDeliveryAddress(
      deliveryAddressSchema.parse({ ...valid, references: '' }),
    );

    expect(line).not.toContain('—');
  });
});

describe('toDeliveryColumns', () => {
  it('guarda las partes y la línea compuesta a la vez', () => {
    const cols = toDeliveryColumns(deliveryAddressSchema.parse(valid));

    // The parts are what a route is built from; the line is the snapshot every
    // screen prints, written once and never recomputed (RN-005).
    expect(cols.deliveryStreet).toBe('Río Guadalquivir');
    expect(cols.deliveryPostalCode).toBe('06500');
    expect(cols.deliveryAddress).toContain('C.P. 06500');
  });

  it('no deja campos indefinidos que la base tomaría como ausentes', () => {
    const cols = toDeliveryColumns(
      deliveryAddressSchema.parse({ ...valid, intNumber: '', references: '' }),
    );

    expect(cols.deliveryIntNumber).toBeNull();
    expect(cols.deliveryReferences).toBeNull();
  });
});
