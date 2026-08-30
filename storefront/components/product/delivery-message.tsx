import { supplyOf, type Product } from '@/lib/commerce/types';

/**
 * "When can it arrive?" — the last question the PDP owes a shopper before the
 * Add to Cart button.
 *
 * Ahora hay tres respuestas, no dos, y la tercera es la que motivó todo el
 * cambio: un producto por encargo **no está aquí**, así que decir «disponible
 * ahora» sería mentir en la línea que existe justamente para no mentir. La
 * fecha concreta ya la dio el aviso de encargo, más arriba; esta línea sólo
 * tiene que dejar de contradecirla.
 */
export default function DeliveryMessage({ product }: { product: Product }) {
  const supply = supplyOf(product);

  return (
    /* Verde Espuma rather than an outlined cream card: the design system names
       this token as the background for a one-line informational notice on
       cream, and the bordered surface it used before was the same treatment as
       a form field directly above it — so the one sentence that answers "when
       does it arrive" looked like something to fill in. */
    <div className="rounded-sm bg-brand-soft px-4 py-3 text-sm">
      {supply.type === 'preorder' ? (
        <p className="text-foreground">
          Lo conseguimos para ti · Entrega refrigerada
        </p>
      ) : product.availableForSale ? (
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
