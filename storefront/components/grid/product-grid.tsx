import type { Product } from '@/lib/commerce/types';
import ProductCard from './product-card';

/**
 * One grid, every collection: 2 columns on mobile, 3 from `sm`, 4 from `lg`.
 *
 * Two columns on mobile and not one — the weekly-pantry shopper is comparing,
 * and a single column turns comparison into scrolling.
 *
 * The vertical gap is nearly twice the horizontal one. Each card now ends in a
 * hairline rule, and rules stacked at an even gap read as a table the shopper
 * did not ask for; the extra air is what keeps a card reading as one object
 * with a line under it rather than as a row in a ledger.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="border-t border-border py-12 text-center text-muted">
        No hay productos disponibles por ahora.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
