import type { Product } from '@/lib/commerce';
import ProductGridItem from './product-grid-item';

/** 2 columns on mobile, 3 on tablet, 4 on desktop — one grid, every collection. */
export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted">
        No hay productos disponibles por ahora.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductGridItem product={product} />
        </li>
      ))}
    </ul>
  );
}
