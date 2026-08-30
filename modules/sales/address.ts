/**
 * SAL — the delivery address. Pure: no database, no session.
 *
 * A single free-text box was enough while "a domicilio" meant a phone call and
 * someone who knew the neighbourhood. It stops being enough the moment anybody
 * wants to sort a route, check a postal code against a delivery zone, or hand
 * an address to a courier — none of which can be done to a sentence.
 *
 * The parts are the truth; the one-line form is a snapshot composed from them
 * once, at the moment the order is placed, and never recomputed. That is the
 * same rule `orderItems` follows for names and prices (RN-005): changing how
 * addresses are formatted tomorrow must not rewrite an order from today.
 */
import { z } from 'zod';

/**
 * The 32 federal entities, as INEGI names them.
 *
 * A closed list rather than free text: "CDMX", "Ciudad de México", "D.F." and
 * "Distrito Federal" are the same place, and four spellings of it make delivery
 * zones impossible to define and reports impossible to group.
 */
export const MEXICAN_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
] as const;

export type MexicanState = (typeof MEXICAN_STATES)[number];

const required = (max: number, label: string) =>
  z
    .string({ invalid_type_error: `Escribe ${label}.` })
    .trim()
    .min(1, { message: `Escribe ${label}.` })
    .max(max, { message: `${label} no puede pasar de ${max} caracteres.` });

const optional = (max: number, label: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      const s = typeof v === 'string' ? v.trim() : '';
      return s === '' ? null : s;
    })
    .refine((v) => v === null || v.length <= max, {
      message: `${label} no puede pasar de ${max} caracteres.`,
    });

export const deliveryAddressSchema = z.object({
  street: required(160, 'la calle'),
  extNumber: required(20, 'el número exterior'),
  // Optional because plenty of Mexican addresses have no interior number, and
  // demanding one makes people type "N/A" — which is worse than a null.
  intNumber: optional(20, 'El número interior'),
  neighborhood: required(120, 'la colonia'),
  city: required(120, 'el municipio o alcaldía'),
  state: z.enum(MEXICAN_STATES, {
    errorMap: () => ({ message: 'Elige un estado.' }),
  }),
  postalCode: z
    .string({ invalid_type_error: 'Escribe el código postal.' })
    .trim()
    .regex(/^[0-9]{5}$/, {
      message: 'El código postal son 5 dígitos. Ejemplo: 06000.',
    }),
  /**
   * How to find the door.
   *
   * Optional in the schema and close to mandatory in practice: in much of
   * Mexico the reference is what actually gets the delivery there. The form
   * asks for it prominently even though the database does not insist.
   */
  references: optional(500, 'Las referencias'),
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

/**
 * The parts, as one line, for everything that only needs to print an address.
 *
 * Order follows how an address is said out loud in Mexico: street and number,
 * then interior, then colonia, then municipio, then state and postal code.
 * References go last, after a dash, because they are an instruction rather than
 * part of the address.
 */
export function formatDeliveryAddress(address: DeliveryAddress): string {
  const line = [
    `${address.street} ${address.extNumber}`,
    address.intNumber ? `Int. ${address.intNumber}` : null,
    `Col. ${address.neighborhood}`,
    address.city,
    address.state,
    `C.P. ${address.postalCode}`,
  ]
    .filter(Boolean)
    .join(', ');

  return address.references ? `${line} — Ref: ${address.references}` : line;
}

/** The database columns, from the validated parts. */
export function toDeliveryColumns(address: DeliveryAddress) {
  return {
    deliveryAddress: formatDeliveryAddress(address),
    deliveryStreet: address.street,
    deliveryExtNumber: address.extNumber,
    deliveryIntNumber: address.intNumber,
    deliveryNeighborhood: address.neighborhood,
    deliveryCity: address.city,
    deliveryState: address.state,
    deliveryPostalCode: address.postalCode,
    deliveryReferences: address.references,
  };
}

/** Every delivery column blanked, for a pickup order. */
export const EMPTY_DELIVERY_COLUMNS = {
  deliveryAddress: null,
  deliveryStreet: null,
  deliveryExtNumber: null,
  deliveryIntNumber: null,
  deliveryNeighborhood: null,
  deliveryCity: null,
  deliveryState: null,
  deliveryPostalCode: null,
  deliveryReferences: null,
} as const;
