import type { Product } from '@/lib/commerce/types';

/**
 * "When can it arrive?" — the last question the PDP owes a shopper before the
 * Add to Cart button.
 *
 * Deliberately does not promise a date: delivery windows are not modelled in
 * the backend yet, and inventing one would be a promise the shop cannot keep.
 * It states what is actually true — the product is here, and it ships cold.
 */
export default function DeliveryMessage({ product }: { product: Product }) {
  return (
    <div className="rounded border border-border bg-surface px-4 py-3 text-sm">
      {product.availableForSale ? (
        <p className="text-foreground">
          Disponible ahora · Entrega refrigerada
        </p>
      ) : (
        <p className="text-foreground">
          Agotado por el momento. Vuelve a consultar: el inventario se actualiza
          conforme llega producto fresco.
        </p>
      )}

      {product.storageInstructions ? (
        <p className="mt-1 text-muted">{product.storageInstructions}</p>
      ) : null}
    </div>
  );
}
