/**
 * SAL — Sales bounded context.
 *
 * E-Order and E-OrderItem. See DOCS/MODELO-DATOS.md §7–§9.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { customers } from './customers';
import { products, supplyTypeEnum } from './catalog';
import { deliveryZones } from './delivery';
import { adminUsers } from './identity';

/** Operational state: where the order is (DOCS §8). */
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]);

/**
 * Money state: where the payment is (DOCS §9).
 *
 * A separate machine from `status` on purpose (RN-006, INV-ORD-07). Marking an
 * order paid must not advance it operationally, and completing it must not
 * claim it was charged.
 */
export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  // A payment attempt is in flight but no money has moved: an OXXO voucher was
  // issued, a SPEI transfer is on its way. It is NOT `unpaid` — the counter
  // needs to know whether to wait — and it is emphatically not `paid`.
  'processing',
  'paid',
  // Money came back, but not all of it. Two kilos were ordered, one and a half
  // arrived, the difference was returned. Neither `paid` nor `refunded` can say
  // that without lying in one direction or the other.
  'partially_refunded',
  'refunded',
]);

/**
 * How this order was agreed to be paid (DOCS/PAGOS.md §4).
 *
 * Not how it *was* paid — that is the `payments` ledger. This is the agreement,
 * and it is what decides whether the shop may start cutting fish before the
 * money arrives (the gates in `state-machine.ts`).
 *
 * `on_site` is the default because it is what every order that already exists
 * is: taken over the phone, paid at the counter. A default of `online` would
 * make the migration rewrite history it knows nothing about.
 */
export const paymentModeEnum = pgEnum('payment_mode', ['online', 'on_site']);

/**
 * Por qué el envío costó lo que costó (DEL).
 *
 * - `none` — no aplica: el pedido se recoge en tienda.
 * - `zone` — se cobró la tarifa de la zona del código postal.
 * - `free_over_threshold` — la zona regala el envío a partir de cierto monto y
 *   este pedido lo alcanzó.
 * - `waived` — alguien del negocio decidió no cobrarlo, y dijo por qué.
 */
export const deliveryFeeReasonEnum = pgEnum('delivery_fee_reason', [
  'none',
  'zone',
  'free_over_threshold',
  'waived',
]);

export const fulfillmentTypeEnum = pgEnum('fulfillment_type', [
  'pickup',
  'delivery',
]);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Human-facing identity: "pedido 1043" is what staff and customer say on
    // the phone. The uuid is for the system, never for a person.
    orderNumber: bigint('order_number', { mode: 'number' })
      .generatedAlwaysAsIdentity()
      .notNull(),

    /**
     * Opaque handle for the public order-confirmation page.
     *
     * `orderNumber` is sequential, so a confirmation URL built on it would let
     * anyone iterate 1, 2, 3… and read every customer's name, phone and
     * address. The number stays the thing people say out loud; this is the
     * thing that goes in a URL.
     */
    publicToken: uuid('public_token').notNull().defaultRandom().unique(),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    status: orderStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status')
      .notNull()
      .default('unpaid'),
    paymentMode: paymentModeEnum('payment_mode').notNull().default('on_site'),
    fulfillmentType: fulfillmentTypeEnum('fulfillment_type')
      .notNull()
      .default('pickup'),

    // Contact snapshot. Editing the Customer later must not rewrite who was
    // called for a past order (INV-CUS-03).
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }),

    /**
     * The delivery address, as one line.
     *
     * Kept alongside the structured columns below rather than replaced by them.
     * It is the *snapshot*: composed once by the service from the parts and
     * never recomputed, so a past order still reads the way it was written even
     * if the format changes. Every screen that only needs to print an address
     * reads this one field.
     */
    deliveryAddress: text('delivery_address'),

    /*
     * The address in pieces (RF-DEL).
     *
     * A single free-text box was enough while "delivery" meant a phone call and
     * a person who knew the neighbourhood. It stops being enough the moment
     * anyone wants to sort a route, check a postal code against a delivery zone,
     * or hand an address to a courier — none of which can be done to a sentence.
     *
     * Nullable across the board because a pickup order has no address at all,
     * and required *together* by a CHECK rather than one by one.
     */
    deliveryStreet: varchar('delivery_street', { length: 160 }),
    deliveryExtNumber: varchar('delivery_ext_number', { length: 20 }),
    // Interior number and references stay optional: plenty of Mexican addresses
    // have neither, and demanding them would make people invent values.
    deliveryIntNumber: varchar('delivery_int_number', { length: 20 }),
    deliveryNeighborhood: varchar('delivery_neighborhood', { length: 120 }),
    deliveryCity: varchar('delivery_city', { length: 120 }),
    deliveryState: varchar('delivery_state', { length: 64 }),
    deliveryPostalCode: varchar('delivery_postal_code', { length: 5 }),
    /**
     * How to find the door.
     *
     * Optional in the schema and close to mandatory in practice: in much of
     * Mexico the reference is what actually gets the delivery there, and the
     * form asks for it even though the database does not insist.
     */
    deliveryReferences: text('delivery_references'),

    /*
     * De dónde salió `deliveryFeeCents`.
     *
     * El importe solo no explica nada: cero puede ser «no aplica», «la zona lo
     * regala a partir de $800» o «el dueño se lo perdonó a un cliente enojado»,
     * y esas tres cosas se auditan distinto.
     *
     * `deliveryZoneName` es una copia, no una lectura: las zonas se renombran y
     * las tarifas cambian, y un pedido de hace tres meses tiene que poder
     * explicar su propio cobro sin depender de cómo esté la tabla hoy (RN-005).
     */
    deliveryZoneId: uuid('delivery_zone_id').references(() => deliveryZones.id, {
      onDelete: 'restrict',
    }),
    deliveryZoneName: varchar('delivery_zone_name', { length: 120 }),
    deliveryFeeReason: deliveryFeeReasonEnum('delivery_fee_reason')
      .notNull()
      .default('none'),
    /** Obligatoria cuando se perdona el envío: una exención sin motivo no se audita. */
    deliveryFeeNote: text('delivery_fee_note'),
    deliveryFeeWaivedBy: uuid('delivery_fee_waived_by').references(
      () => adminUsers.id,
      { onDelete: 'set null' },
    ),

    subtotalCents: integer('subtotal_cents').notNull(),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /**
     * Cuándo se le prometió al cliente.
     *
     * `NULL` en un pedido normal: sale hoy o cuando el mostrador lo tenga listo.
     * Con fecha cuando el pedido lleva algo por encargo, y entonces es la
     * llegada **más lejana** de sus líneas — un pedido se entrega junto, así que
     * el pescado fresco que lo acompaña espera al encargo. Es una consecuencia
     * incómoda y por eso el checkout la dice en voz alta antes de confirmar.
     */
    promisedFor: timestamp('promised_for', { withTimezone: true }),

    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_order_number_idx').on(table.orderNumber),
    index('orders_status_created_idx').on(table.status, table.createdAt.desc()),
    index('orders_payment_created_idx').on(
      table.paymentStatus,
      table.createdAt.desc(),
    ),
    index('orders_customer_created_idx').on(
      table.customerId,
      table.createdAt.desc(),
    ),
    index('orders_created_id_idx').on(table.createdAt.desc(), table.id),

    check(
      'orders_amounts_non_negative',
      sql`${table.subtotalCents} >= 0 AND ${table.deliveryFeeCents} >= 0 AND ${table.totalCents} >= 0`,
    ),
    // The total is arithmetic, not an opinion (INV-ORD-02). A client that posts
    // its own total cannot make it stick (RN-008).
    check(
      'orders_total_is_sum',
      sql`${table.totalCents} = ${table.subtotalCents} + ${table.deliveryFeeCents}`,
    ),
    check(
      'orders_delivery_needs_address',
      sql`${table.fulfillmentType} <> 'delivery' OR (${table.deliveryAddress} IS NOT NULL AND length(btrim(${table.deliveryAddress})) > 0)`,
    ),
    /**
     * A delivery needs an address that can be routed, not just printed.
     *
     * Added `NOT VALID` in the migration: orders placed before this existed
     * carry only the free-text line, and there is no honest way to parse a
     * sentence into a street and a postal code. The rule governs everything
     * written from now on; history keeps what it had.
     */
    check(
      'orders_delivery_needs_address_parts',
      sql`${table.fulfillmentType} <> 'delivery' OR (
        ${table.deliveryStreet} IS NOT NULL AND length(btrim(${table.deliveryStreet})) > 0
        AND ${table.deliveryExtNumber} IS NOT NULL AND length(btrim(${table.deliveryExtNumber})) > 0
        AND ${table.deliveryNeighborhood} IS NOT NULL AND length(btrim(${table.deliveryNeighborhood})) > 0
        AND ${table.deliveryCity} IS NOT NULL AND length(btrim(${table.deliveryCity})) > 0
        AND ${table.deliveryState} IS NOT NULL AND length(btrim(${table.deliveryState})) > 0
        AND ${table.deliveryPostalCode} ~ '^[0-9]{5}$'
      )`,
    ),
    /**
     * Cash is only collected across the counter.
     *
     * The shop offers two ways to pay: cash when you come and pick it up, or
     * online — and an online order can be delivered or collected. What is not
     * on offer is paying the driver: putting product on a motorbike against a
     * promise is the one combination whose downside lands entirely on the shop.
     *
     * Enforced here as well as in the validators because a Server Action is a
     * public POST endpoint, and this is the constraint with money behind it.
     * `NOT VALID` for the same reason as above — one order predates the rule.
     */
    /**
     * Perdonar el envío es una decisión con autor y motivo, o no es nada.
     *
     * Sin esto, `waived` se convertiría en el cajón donde acaba cualquier cero
     * que nadie supo explicar — y la diferencia entre «lo regalamos por la
     * demora» y «alguien se equivocó» es exactamente lo que hay que poder
     * reconstruir seis meses después.
     */
    check(
      'orders_waived_fee_has_reason',
      sql`${table.deliveryFeeReason} <> 'waived' OR (
        ${table.deliveryFeeNote} IS NOT NULL
        AND length(btrim(${table.deliveryFeeNote})) > 0
        AND ${table.deliveryFeeCents} = 0
      )`,
    ),
    // Recoger en tienda no puede llevar cobro de envío ni zona.
    check(
      'orders_pickup_has_no_delivery_fee',
      sql`${table.fulfillmentType} <> 'pickup' OR (
        ${table.deliveryFeeCents} = 0 AND ${table.deliveryFeeReason} = 'none'
      )`,
    ),
    check(
      'orders_cash_is_pickup_only',
      sql`${table.paymentMode} <> 'on_site' OR ${table.fulfillmentType} = 'pickup'`,
    ),
    // Timestamps and status cannot disagree (INV-ORD-05, INV-ORD-06): a
    // completed order has a completion time, and only a completed order does.
    check(
      'orders_completed_at_matches_status',
      sql`(${table.status} = 'completed') = (${table.completedAt} IS NOT NULL)`,
    ),
    check(
      'orders_cancelled_at_matches_status',
      sql`(${table.status} = 'cancelled') = (${table.cancelledAt} IS NOT NULL)`,
    ),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    // RESTRICT: a product that has been sold cannot be deleted (RN-007). It is
    // archived instead.
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    // Price/name snapshot (RN-005, INV-ITM-04). Changing the catalogue tomorrow
    // must not rewrite what was sold today.
    productName: varchar('product_name', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 64 }).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),

    /*
     * Cómo se abastecía este producto **cuando se vendió**.
     *
     * Copia, igual que el nombre y el precio (RN-005), y por una razón que va
     * más allá de la fidelidad histórica: es lo que decide si esta línea mueve
     * inventario. Un congelado que mañana pase a ser de encargo no debe cambiar
     * lo que hay que hacer con un pedido de la semana pasada — y si se leyera
     * del catálogo actual, completar ese pedido intentaría descontar existencia
     * que nunca se reservó.
     */
    supplyType: supplyTypeEnum('supply_type').notNull().default('fresh'),
    /** Cuándo llega esta línea, para las de encargo. */
    promisedFor: timestamp('promised_for', { withTimezone: true }),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => [
    index('order_items_order_idx').on(table.orderId),
    index('order_items_product_idx').on(table.productId),

    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
    check('order_items_price_positive', sql`${table.unitPriceCents} > 0`),
    check(
      'order_items_line_total_is_product',
      sql`${table.lineTotalCents} = ${table.unitPriceCents} * ${table.quantity}`,
    ),
  ],
);

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PaymentMode = (typeof paymentModeEnum.enumValues)[number];
export type DeliveryFeeReason =
  (typeof deliveryFeeReasonEnum.enumValues)[number];
export type FulfillmentType = (typeof fulfillmentTypeEnum.enumValues)[number];
