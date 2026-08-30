/**
 * DEL — Delivery bounded context.
 *
 * Previsto en DOCS/README.md como «extensión futura de SAL/TDA»; el futuro
 * llegó cuando la tienda empezó a cobrar en línea y descubrió que estaba
 * regalando el envío.
 *
 * Dos tablas y una idea: **el precio del envío lo decide el código postal.**
 * Una zona agrupa códigos postales y les pone una tarifa; un código postal que
 * no está en ninguna zona es un sitio a donde la tienda no llega, que es una
 * respuesta distinta de «el envío cuesta cero».
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const deliveryZones = pgTable(
  'delivery_zones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    feeCents: integer('fee_cents').notNull(),
    /**
     * A partir de cuánto sale gratis. `NULL` = nunca sale gratis por monto.
     *
     * Se compara contra el **subtotal de mercancía**, no contra el total: si se
     * comparara contra el total, el propio envío empujaría el pedido por encima
     * del umbral y el umbral se pagaría a sí mismo.
     */
    freeOverCents: integer('free_over_cents'),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('delivery_zones_active_sort_idx').on(table.active, table.sortOrder),

    // Cero es legítimo: una zona de reparto gratuito es una decisión comercial,
    // no un error. Negativo no lo es.
    check('delivery_zones_fee_non_negative', sql`${table.feeCents} >= 0`),
    check(
      'delivery_zones_free_over_positive',
      sql`${table.freeOverCents} IS NULL OR ${table.freeOverCents} > 0`,
    ),
  ],
);

/**
 * Qué códigos postales cubre cada zona.
 *
 * Tabla aparte y no un arreglo dentro de la zona, para poder poner un índice
 * único sobre el código postal: **un código postal pertenece a una sola zona.**
 * Si perteneciera a dos, no habría respuesta a «¿cuánto cuesta el envío?», y esa
 * ambigüedad es justo la clase de cosa que aparece meses después como una queja
 * de un cliente al que se le cobró distinto que a su vecino.
 */
export const deliveryZonePostalCodes = pgTable(
  'delivery_zone_postal_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    zoneId: uuid('zone_id')
      .notNull()
      .references(() => deliveryZones.id, { onDelete: 'cascade' }),
    postalCode: varchar('postal_code', { length: 5 }).notNull(),
  },
  (table) => [
    uniqueIndex('delivery_zone_postal_codes_code_idx').on(table.postalCode),
    index('delivery_zone_postal_codes_zone_idx').on(table.zoneId),

    check(
      'delivery_zone_postal_codes_shape',
      sql`${table.postalCode} ~ '^[0-9]{5}$'`,
    ),
  ],
);

export type DeliveryZoneRow = typeof deliveryZones.$inferSelect;
export type DeliveryZonePostalCodeRow =
  typeof deliveryZonePostalCodes.$inferSelect;

/*
 * `deliveryFeeReasonEnum` y `DeliveryFeeReason` viven en `sales.ts`, junto a la
 * columna que los usa. Estaban aquí también y eran el mismo nombre exportado
 * dos veces desde el barrel — el compilador lo cazó antes de que llegara a
 * ninguna parte.
 */
