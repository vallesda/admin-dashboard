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
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { inventory, type InventoryRow } from '@/db/schema/inventory';

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
