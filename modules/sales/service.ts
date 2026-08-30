import 'server-only';

/**
 * SAL — Order use cases.
 *
 * Realiza: RF-SAL-001…006 · HU-SAL-001.
 *
 * This is where Sales and Inventory meet. Everything an order does to stock
 * happens in the same transaction that writes the order (RN-004, RNF-DAT-002):
 * a reservation with no order, or an order with no reservation, would both be
 * corruption nobody could explain afterwards.
 */
import { eq, inArray, sql as raw } from 'drizzle-orm';

import { db } from '@/db';
import { products } from '@/db/schema/catalog';
import { customers } from '@/db/schema/customers';
import { inventory, inventoryMovements } from '@/db/schema/inventory';
import type { DeliveryFeeReason } from '@/db/schema/sales';
import {
  orders,
  orderItems,
  type OrderRow,
  type OrderStatus,
  type PaymentStatus,
} from '@/db/schema/sales';
import { ConflictError, DomainError, NotFoundError } from '@/lib/errors';
import { toDeliveryColumns, EMPTY_DELIVERY_COLUMNS } from './address';
import { findZoneForPostalCode } from '@/modules/delivery/queries';
import { applyWaiver, quoteDelivery } from '@/modules/delivery/quote';
import {
  canTransition,
  canTransitionPayment,
  canTransitionWithPayment,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from './state-machine';
import type { CreateOrderInput } from './validators';

/**
 * Creates an order and reserves its stock, atomically.
 *
 * Prices come from the catalogue, never from the caller (RN-008). The client
 * sends product ids and quantities; the total is arithmetic done here and
 * re-checked by a database CHECK.
 */
export async function createOrder(
  input: CreateOrderInput,
  actorId: string | null,
): Promise<OrderRow> {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(eq(customers.id, input.customerId))
      .limit(1);

    if (!customer) throw new NotFoundError('el cliente', input.customerId);

    const productIds = input.lines.map((l) => l.productId);

    // Lock the inventory rows for every product in the order, in one statement
    // ordered by id. Locking in a consistent order is what stops two concurrent
    // orders for the same two products from deadlocking each other.
    const stock = await tx
      .select({
        productId: inventory.productId,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
      })
      .from(inventory)
      .where(inArray(inventory.productId, productIds))
      .orderBy(inventory.productId)
      .for('update');

    const stockByProduct = new Map(stock.map((s) => [s.productId, s]));

    const catalogue = await tx
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        priceCents: products.priceCents,
        status: products.status,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productById = new Map(catalogue.map((p) => [p.id, p]));

    const items: {
      productId: string;
      productName: string;
      sku: string;
      unitPriceCents: number;
      quantity: number;
      lineTotalCents: number;
    }[] = [];

    for (const line of input.lines) {
      const product = productById.get(line.productId);

      if (!product) throw new NotFoundError('el producto', line.productId);

      // Only `active` products can enter a new order (RF-CAT-007, INV-PRO-06).
      if (product.status !== 'active') {
        throw new DomainError(
          'order.product_not_sellable',
          `“${product.name}” no está activo y no se puede vender.`,
          'lines',
        );
      }

      const balance = stockByProduct.get(line.productId);

      if (!balance) {
        throw new DomainError(
          'order.no_inventory',
          `“${product.name}” no tiene inventario inicializado.`,
          'lines',
        );
      }

      const available = balance.onHand - balance.reserved;

      if (line.quantity > available) {
        throw new DomainError(
          'order.insufficient_stock',
          `Solo hay ${available} de “${product.name}” disponibles.`,
          'lines',
        );
      }

      items.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
        lineTotalCents: product.priceCents * line.quantity,
      });
    }

    const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);

    /*
     * El envío lo cotiza el servidor desde el código postal, nunca lo manda el
     * cliente. Es `RN-008` aplicado al envío: el carrito dice a dónde va, y la
     * tienda dice cuánto cuesta llevarlo.
     *
     * El umbral de «gratis a partir de X» se compara contra el **subtotal de
     * mercancía**, que es la cifra que se acaba de calcular arriba. Contra el
     * total, el propio envío empujaría el pedido por encima del umbral y
     * acabaría pagándose a sí mismo.
     */
    let delivery = {
      deliveryFeeCents: 0,
      deliveryZoneId: null as string | null,
      deliveryZoneName: null as string | null,
      deliveryFeeReason: 'none' as DeliveryFeeReason,
      deliveryFeeNote: null as string | null,
      deliveryFeeWaivedBy: null as string | null,
    };

    if (input.fulfillmentType === 'delivery' && input.deliveryAddress) {
      const zone = await findZoneForPostalCode(input.deliveryAddress.postalCode);
      const quote = quoteDelivery(zone, subtotalCents);

      if (!quote.covered) {
        // No es «el envío cuesta cero»: es un sitio a donde la tienda no llega.
        // Decirlo así evita aceptar un pedido que nadie va a poder entregar.
        throw new DomainError(
          'order.out_of_delivery_range',
          `No hacemos entregas en el código postal ${input.deliveryAddress.postalCode}.`,
          'postalCode',
        );
      }

      const applied = input.waiveDeliveryFeeNote
        ? applyWaiver(quote, input.waiveDeliveryFeeNote)
        : { feeCents: quote.feeCents, reason: quote.reason, note: null };

      delivery = {
        deliveryFeeCents: applied.feeCents,
        deliveryZoneId: quote.zoneId,
        // Copia, no lectura: las zonas se renombran y las tarifas cambian, y
        // este pedido tiene que poder explicar su cobro dentro de un año.
        deliveryZoneName: quote.zoneName,
        deliveryFeeReason: applied.reason,
        deliveryFeeNote: applied.note,
        deliveryFeeWaivedBy: applied.reason === 'waived' ? actorId : null,
      };
    }

    const [order] = await tx
      .insert(orders)
      .values({
        customerId: customer.id,
        // Contact snapshot: editing the customer later must not rewrite who was
        // called for this order (INV-CUS-03).
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        fulfillmentType: input.fulfillmentType,
        paymentMode: input.paymentMode,
        /*
         * The address is stored twice on purpose: in parts, which is what a
         * route or a delivery zone can be built from, and as one composed line,
         * which is the snapshot every screen prints. The line is written once
         * here and never recomputed — the same rule `orderItems` follows for
         * names and prices (RN-005), so changing the format tomorrow cannot
         * rewrite an order from today.
         */
        ...(input.fulfillmentType === 'delivery' && input.deliveryAddress
          ? toDeliveryColumns(input.deliveryAddress)
          : EMPTY_DELIVERY_COLUMNS),
        subtotalCents,
        ...delivery,
        totalCents: subtotalCents + delivery.deliveryFeeCents,
        notes: input.notes,
      })
      .returning();

    await tx.insert(orderItems).values(
      items.map((i) => ({ orderId: order.id, ...i })),
    );

    for (const item of items) {
      await tx
        .update(inventory)
        .set({
          reserved: raw`${inventory.reserved} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.productId, item.productId));

      await tx.insert(inventoryMovements).values({
        productId: item.productId,
        type: 'reserve',
        onHandDelta: 0,
        // Reserving does not move goods: they are still in the cold room, just
        // promised. Only `available` drops.
        reservedDelta: item.quantity,
        orderId: order.id,
        createdBy: actorId,
      });
    }

    return order;
  });
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/**
 * Moves an order to `next`, applying that transition's effect on Inventory.
 *
 * One entry point for all eight transitions rather than a method per verb: the
 * legality check, the stock effect and the timestamp then live together and
 * cannot drift apart. Everything runs in one transaction (RN-004).
 *
 * Effects (DOCS §8):
 *   completed → each reservation becomes a sale
 *   cancelled → each reservation is released
 *   everything else → status only
 */
export async function changeOrderStatus(
  orderId: string,
  next: OrderStatus,
  actorId: string | null,
  options?: { confirmed?: boolean; tx?: Tx },
): Promise<OrderRow> {
  const run = async (tx: Tx): Promise<OrderRow> => {
    // Lock the order first: two staff members clicking "Completar" at the same
    // moment must not both convert the same reservation into a sale.
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update')
      .limit(1);

    if (!order) throw new NotFoundError('el pedido', orderId);

    if (order.status === next) {
      // Idempotent: re-confirming a confirmed order is not an error, and it
      // must not run the stock effect a second time.
      return order;
    }

    /*
     * The gates (DOCS/PAGOS.md §7).
     *
     * `canTransitionWithPayment` subsumes `canTransition`: it checks the
     * operational move first and then asks the money machine whether this
     * particular order may make it. The same function draws the buttons, so
     * the panel never offers a move this will refuse.
     */
    const verdict = canTransitionWithPayment(order.status, next, {
      status: order.paymentStatus,
      mode: order.paymentMode,
    });

    if (!verdict.allowed) {
      throw new DomainError('order.illegal_transition', verdict.reason);
    }

    /*
     * A verdict that needs confirming is not a warning the service may ignore.
     * The caller has to say it showed the operator the consequence and got a
     * yes; otherwise this is a mis-click, and mis-clicks that hand over unpaid
     * fish are exactly what these gates exist to stop.
     */
    if (verdict.requiresConfirmation && !options?.confirmed) {
      throw new ConflictError(
        'order.needs_confirmation',
        verdict.requiresConfirmation,
      );
    }

    if (next === 'completed') {
      await convertReservationsToSale(tx, order.id, actorId);
    } else if (next === 'cancelled') {
      await releaseReservations(tx, order.id, actorId);
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: next,
        updatedAt: new Date(),
        // The CHECK constraints require timestamp and status to agree
        // (INV-ORD-05, INV-ORD-06), so they are set in the same statement.
        completedAt: next === 'completed' ? new Date() : null,
        cancelledAt: next === 'cancelled' ? new Date() : null,
      })
      .where(eq(orders.id, order.id))
      .returning();

    return updated;
  };

  // `tx` lets "cobrar y entregar" fold the collection and the handover into one
  // transaction: money recorded and goods released together, or neither.
  return options?.tx ? run(options.tx) : db.transaction(run);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * `ready → completed`: the goods leave (RF-INV-007).
 *
 * One `sale` movement per line, carrying both deltas: `on_hand` drops because
 * the fish physically left, and `reserved` drops because the promise was kept.
 * The ledger CHECK requires them to be equal and negative (INV-MOV-05).
 */
async function convertReservationsToSale(
  tx: Tx,
  orderId: string,
  actorId: string | null,
): Promise<void> {
  const lines = await tx
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines) {
    await tx
      .update(inventory)
      .set({
        onHand: raw`${inventory.onHand} - ${line.quantity}`,
        reserved: raw`${inventory.reserved} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, line.productId));

    await tx.insert(inventoryMovements).values({
      productId: line.productId,
      type: 'sale',
      onHandDelta: -line.quantity,
      reservedDelta: -line.quantity,
      orderId,
      createdBy: actorId,
    });
  }
}

/**
 * Cancelling an open order gives the units back (RF-INV-006).
 *
 * Only `reserved` moves: nothing ever left the cold room, so `on_hand` is
 * untouched. Cancelling is only reachable from a state that still holds a
 * reservation, which is why there is no "was it already sold?" branch here —
 * `completed` has no outgoing transition at all.
 */
async function releaseReservations(
  tx: Tx,
  orderId: string,
  actorId: string | null,
): Promise<void> {
  const lines = await tx
    .select({
      productId: orderItems.productId,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines) {
    await tx
      .update(inventory)
      .set({
        reserved: raw`${inventory.reserved} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, line.productId));

    await tx.insert(inventoryMovements).values({
      productId: line.productId,
      type: 'release',
      onHandDelta: 0,
      reservedDelta: -line.quantity,
      orderId,
      createdBy: actorId,
    });
  }
}

/*
 * `changePaymentStatus` used to live here.
 *
 * It is gone on purpose. `orders.paymentStatus` is now a projection of the
 * `payments`/`refunds` ledger and has exactly one writer —
 * `modules/payments/service.recomputePaymentStatus` — which runs inside the
 * transaction that changed the money (DOCS/PAGOS.md §6).
 *
 * A function here that set the column directly would be a second writer with no
 * ledger behind it, which is precisely the situation that made Stripe and the
 * counter impossible to reconcile. Collecting is `recordPayment`; giving money
 * back is `refundOrder`.
 */
