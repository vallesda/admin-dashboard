import 'server-only';

/**
 * INV — Inventory use cases.
 *
 * Realiza: INV-STK-04 (una fila por Product).
 *
 * NOTE ON DEPENDENCY DIRECTION. The declared graph is `INV depends on CAT`:
 * inventory rows point at products. But creating a Product must leave inventory
 * initialised at zero (HU-CAT-002), and that write belongs to this context.
 *
 * The resolution follows regla de gobierno 4 — "las mutaciones no deben
 * escribir datos ajenos sin pasar por el servicio propietario": Catalog calls
 * `initializeInventory` instead of inserting into `inventory` itself. This
 * module never imports from `modules/catalog`, so there is no import cycle;
 * it reads product columns through `db/schema` when it needs them.
 */
import { eq, sql as raw } from 'drizzle-orm';

import { db } from '@/db';
import { products } from '@/db/schema/catalog';
import {
  inventory,
  inventoryMovements,
  type InventoryRow,
} from '@/db/schema/inventory';
import { DomainError, NotFoundError } from '@/lib/errors';
import type { AdjustStockInput, ReceiveStockInput, SetThresholdInput } from './validators';

/** A Drizzle transaction, or the plain db handle when there is no transaction. */
export type DbExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/**
 * Creates the zero row for a brand-new Product.
 *
 * Takes an executor so the caller can run it inside its own transaction: a
 * product that exists without an inventory row would violate INV-STK-04, so
 * the two writes must commit or fail together.
 *
 * `onConflictDoNothing` makes it safe to call twice (e.g. a backfill).
 */
export async function initializeInventory(
  executor: DbExecutor,
  productId: string,
  lowStockThreshold = 0,
): Promise<void> {
  await executor
    .insert(inventory)
    .values({ productId, onHand: 0, reserved: 0, lowStockThreshold })
    .onConflictDoNothing({ target: inventory.productId });
}

/** `available = on_hand - reserved` (INV-STK-05: derived, never stored). */
export function availableOf(row: Pick<InventoryRow, 'onHand' | 'reserved'>) {
  return row.onHand - row.reserved;
}

export async function getInventory(
  productId: string,
): Promise<InventoryRow | undefined> {
  const [row] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .limit(1);

  return row;
}

// ---------------------------------------------------------------------------
// Stock operations
// ---------------------------------------------------------------------------

/**
 * Receives stock: `onHand` goes up, `reserved` untouched (RF-INV-003).
 *
 * The inventory update and the ledger row share one transaction (INV-MOV-07).
 * A movement without the matching balance change — or the reverse — would make
 * the ledger stop explaining the numbers, which is its only job.
 *
 * The update is written as `on_hand = on_hand + n` rather than read-then-write
 * so two concurrent receipts cannot lose one another: the arithmetic happens in
 * the database, under the row lock the UPDATE already takes.
 */
export async function receiveStock(
  input: ReceiveStockInput,
  actorId: string | null,
): Promise<InventoryRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(inventory)
      .set({
        onHand: raw`${inventory.onHand} + ${input.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.productId, input.productId))
      .returning();

    if (!row) throw new NotFoundError('el inventario del producto', input.productId);

    await tx.insert(inventoryMovements).values({
      productId: input.productId,
      type: 'receive',
      onHandDelta: input.quantity,
      reservedDelta: 0,
      note: input.note,
      createdBy: actorId,
    });

    return row;
  });
}

/**
 * Adjusts `onHand` up or down with a mandatory note (RF-INV-004).
 *
 * A negative adjustment must not push `onHand` below `reserved`: those units
 * are already promised to an order. The `inventory_reserved_within_on_hand`
 * CHECK would catch it anyway, but catching it here produces a message that
 * says what to do instead of a constraint-violation stack trace.
 */
export async function adjustStock(
  input: AdjustStockInput,
  actorId: string | null,
): Promise<InventoryRow> {
  return db.transaction(async (tx) => {
    // FOR UPDATE: read and check under a lock, so a concurrent adjustment
    // cannot slip between the check and the write.
    const [current] = await tx
      .select()
      .from(inventory)
      .where(eq(inventory.productId, input.productId))
      .for('update')
      .limit(1);

    if (!current) {
      throw new NotFoundError('el inventario del producto', input.productId);
    }

    const next = current.onHand + input.quantity;

    if (next < 0) {
      throw new DomainError(
        'inventory.negative_on_hand',
        `No puedes dejar el stock en ${next}. Hay ${current.onHand} unidades.`,
        'quantity',
      );
    }

    if (next < current.reserved) {
      throw new DomainError(
        'inventory.below_reserved',
        `No puedes bajar de ${current.reserved}: esas unidades ya están reservadas en pedidos.`,
        'quantity',
      );
    }

    const [row] = await tx
      .update(inventory)
      .set({ onHand: next, updatedAt: new Date() })
      .where(eq(inventory.productId, input.productId))
      .returning();

    await tx.insert(inventoryMovements).values({
      productId: input.productId,
      type: 'adjustment',
      onHandDelta: input.quantity,
      reservedDelta: 0,
      note: input.note,
      createdBy: actorId,
    });

    return row;
  });
}

/**
 * Sets the low-stock threshold (RF-INV-008).
 *
 * No ledger entry: this changes when we want to be warned, not how much stock
 * exists. Writing it to the ledger would pollute the history of movements with
 * something that never moved a unit.
 */
export async function setLowStockThreshold(
  input: SetThresholdInput,
): Promise<InventoryRow> {
  const [row] = await db
    .update(inventory)
    .set({
      lowStockThreshold: input.lowStockThreshold,
      updatedAt: new Date(),
    })
    .where(eq(inventory.productId, input.productId))
    .returning();

  if (!row) throw new NotFoundError('el inventario del producto', input.productId);

  return row;
}

/**
 * Creates the missing inventory row for an existing product.
 *
 * Every product created through `catalog.createProduct` already gets one in the
 * same transaction, so this is a repair path: it covers rows inserted by a
 * migration, by a seed, or by hand — and, until it existed, such a product was
 * invisible on the inventory screen and could never be received or sold.
 *
 * Idempotent: calling it on a product that already has inventory is a no-op,
 * so a double click cannot reset anyone's stock to zero.
 */
export async function ensureInventory(
  productId: string,
): Promise<InventoryRow> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) throw new NotFoundError('el producto', productId);

  await initializeInventory(db, productId);

  const [row] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .limit(1);

  return row;
}

/**
 * Creates inventory rows for every product missing one.
 *
 * Returns how many were created, so a caller can report "nothing to do"
 * honestly instead of implying it fixed something.
 */
export async function backfillInventory(): Promise<number> {
  const missing = await db
    .select({ id: products.id })
    .from(products)
    .leftJoin(inventory, eq(inventory.productId, products.id))
    .where(raw`${inventory.productId} IS NULL`);

  if (missing.length === 0) return 0;

  await db
    .insert(inventory)
    .values(missing.map((p) => ({ productId: p.id })))
    .onConflictDoNothing({ target: inventory.productId });

  return missing.length;
}
