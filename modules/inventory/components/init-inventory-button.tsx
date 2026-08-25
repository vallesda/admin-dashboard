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
      <button
        type="submit"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
      >
        <WrenchScrewdriverIcon className="w-4" />
        Inicializar inventario
        <span className="sr-only"> de {name}</span>
      </button>
    </form>
  );
}
