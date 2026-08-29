import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

import { ensureInventory } from '../actions';

/**
 * Creates the missing inventory row for a product.
 *
 * Only rendered when the row is actually absent. The action is idempotent, so a
 * double submit cannot zero anyone's stock.
 */
export default function InitInventoryButton({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const init = ensureInventory.bind(null, productId);

  return (
    <form action={init}>
      {/* Warn-toned, matching the "Sin inventario" badge in the same row: the
          badge states the problem and this button is its fix, so they should
          read as one thing rather than as a status and an unrelated action. */}
      <button
        type="submit"
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-warn/50 bg-warn-soft px-2.5 text-xs font-medium text-warn transition-colors hover:bg-warn/15"
      >
        <WrenchScrewdriverIcon className="h-4 w-4" aria-hidden="true" />
        Inicializar inventario
        <span className="sr-only"> de {name}</span>
      </button>
    </form>
  );
}
