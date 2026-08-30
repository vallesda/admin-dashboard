/**
 * PAG — Payments bounded context.
 *
 * See DOCS/PAGOS.md. Two tables and a receipt book:
 *
 * - `payments`  — every attempt to collect money, whoever collected it.
 * - `refunds`   — every attempt to give it back.
 * - `stripe_events` — which provider events we already processed.
 *
 * ## Why a ledger and not three columns on `orders`
 *
 * `orders.paymentStatus` used to be a field somebody wrote. With two ways to
 * pay, three online methods, partial refunds and an asynchronous webhook, that
 * field would have five writers and no way to reconstruct how it reached its
 * value. The first time Stripe and the counter disagreed, nothing could say
 * which one was right.
 *
 * So it becomes a projection — exactly the relationship this repository
 * already has between `inventory` (fast to read) and `inventory_movements`
 * (the history that explains it). `paymentStatus` is recomputed from these
 * tables inside the same transaction that writes to them, and is never set
 * directly.
 *
 * ## Why cash and Stripe share a table
 *
 * Collecting is always the same act: recording a `Payment`. The only thing that
 * differs between a card charge and a 500-peso note is *who* confirms the money
 * exists — Stripe over a webhook, or a person with the `admin` role. That is a
 * column, not a second subsystem.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { orders } from './sales';
import { adminUsers } from './identity';

/**
 * Who moved the money.
 *
 * `terminal` is the shop's own card reader, which is a *manual* provider from
 * this system's point of view: nobody calls an API, a person reads the screen
 * and confirms. `transfer` is a SPEI transfer straight to the shop's account,
 * verified by looking at the bank app.
 */
export const paymentProviderEnum = pgEnum('payment_provider', [
  'stripe',
  'cash',
  'terminal',
  'transfer',
]);

/** Whether this provider settles by itself or needs a person. */
export function isManualProvider(provider: PaymentProvider): boolean {
  return provider !== 'stripe';
}

/**
 * The life of one attempt.
 *
 * `created` is an opened checkout session nobody has acted on; `processing` is
 * an issued OXXO voucher — a promise, not money. Only `succeeded` is cash in
 * the account.
 */
export const paymentAttemptEnum = pgEnum('payment_attempt_status', [
  'created',
  'processing',
  'succeeded',
  'failed',
  'expired',
  'canceled',
]);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),

    provider: paymentProviderEnum('provider').notNull(),
    status: paymentAttemptEnum('status').notNull(),
    amountCents: integer('amount_cents').notNull(),
    // The catalogue needs no currency column (one price, one currency, MXN).
    // A payment does: it records what a third party actually moved, and that
    // third party reports a currency. Dropping it throws away information
    // Stripe hands us for free, and reconciliation needs it.
    currency: varchar('currency', { length: 3 }).notNull().default('mxn'),

    // ---- Provider-specific. NULL for everything that is not Stripe. --------
    stripeSessionId: varchar('stripe_session_id', { length: 255 }).unique(),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', {
      length: 255,
    }).unique(),
    stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
    // 'card' | 'oxxo' | 'customer_balance'… Text, not an enum: the catalogue of
    // payment methods belongs to Stripe, and a new one must not require a
    // migration here.
    paymentMethodType: varchar('payment_method_type', { length: 64 }),
    // The OXXO voucher: where to reprint it, and when it stops working.
    hostedVoucherUrl: text('hosted_voucher_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    /**
     * Who recorded the collection.
     *
     * NULL means the provider confirmed it, not a person. That is the same
     * convention `createOrder` already uses for orders nobody at the shop
     * touched.
     */
    actorId: uuid('actor_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    note: text('note'),
    failureReason: text('failure_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => [
    index('payments_order_idx').on(table.orderId),
    index('payments_status_created_idx').on(
      table.status,
      table.createdAt.desc(),
    ),
    index('payments_provider_paid_idx').on(table.provider, table.paidAt.desc()),

    check('payments_amount_positive', sql`${table.amountCents} > 0`),
    /**
     * Every collection has someone answerable for it — a person or a provider,
     * and never neither. This is the rule that makes the ledger auditable
     * rather than merely detailed.
     */
    check(
      'payments_manual_has_actor',
      sql`${table.provider} = 'stripe' OR ${table.actorId} IS NOT NULL`,
    ),
    // A succeeded payment happened at a moment in time. Statuses and timestamps
    // are not allowed to disagree, same as INV-ORD-05 on orders.
    check(
      'payments_paid_at_matches_status',
      sql`(${table.status} = 'succeeded') = (${table.paidAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * Why the money went back.
 *
 * The values match Stripe's `reason` so nothing has to be translated on the way
 * out; `other` carries a mandatory note in the service.
 */
export const refundReasonEnum = pgEnum('refund_reason', [
  'requested_by_customer',
  'duplicate',
  'fraudulent',
  'other',
]);

export const refundStatusEnum = pgEnum('refund_status', [
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'canceled',
]);

export const refunds = pgTable(
  'refunds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    // Denormalised on purpose: every screen that shows refunds shows them by
    // order, and joining through `payments` for a list view is a join nobody
    // needs to pay for.
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),

    amountCents: integer('amount_cents').notNull(),
    reason: refundReasonEnum('reason').notNull().default('requested_by_customer'),
    note: text('note'),
    status: refundStatusEnum('status').notNull(),

    /**
     * NULL when the money went back by hand.
     *
     * Returning cash is a refund too. If the customer paid at the counter and
     * gets 180 pesos in notes, that is a row here with no Stripe id — the same
     * book for both ways of paying, differing only in who moved the money.
     */
    stripeRefundId: varchar('stripe_refund_id', { length: 255 }).unique(),
    failureReason: text('failure_reason'),

    actorId: uuid('actor_id').references(() => adminUsers.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('refunds_order_idx').on(table.orderId),
    index('refunds_payment_idx').on(table.paymentId),

    check('refunds_amount_positive', sql`${table.amountCents} > 0`),
  ],
);

/**
 * Provider events already processed.
 *
 * Stripe documents plainly that an endpoint may receive the same event more
 * than once, and that delivery order is not guaranteed. It recommends
 * recording the event ids. An `INSERT … ON CONFLICT DO NOTHING` that touches no
 * rows means "already handled: answer 200 and do nothing" — one line of SQL,
 * and the difference between confirming an order once or three times.
 *
 * `created` is deliberately not stored: Stripe warns against using it to infer
 * order. The handler re-reads the object from the API instead.
 */
export const stripeEvents = pgTable('stripe_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: varchar('type', { length: 128 }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export type PaymentRow = typeof payments.$inferSelect;
export type RefundRow = typeof refunds.$inferSelect;
export type PaymentProvider = (typeof paymentProviderEnum.enumValues)[number];
export type PaymentAttemptStatus =
  (typeof paymentAttemptEnum.enumValues)[number];
export type RefundReason = (typeof refundReasonEnum.enumValues)[number];
export type RefundStatus = (typeof refundStatusEnum.enumValues)[number];
