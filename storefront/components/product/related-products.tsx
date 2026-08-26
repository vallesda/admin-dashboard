import { getProductRecommendations } from '@/lib/commerce';
import ProductGrid from '@/components/grid/product-grid';

/**
 * Same-category cross-sells.
 *
 * Fetches its own data so the PDP can stream it behind a Suspense boundary —
 * the purchase panel must not wait on a recommendation query.
 *
 * Renders nothing when there is nothing relevant. Padding the row with
 * unrelated products would be worse than an absent section: the spec is
 * explicit that cross-sells must be relevant.
 */
export default async function RelatedProducts({ handle }: { handle: string }) {
  const products = await getProductRecommendations(handle);

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-8 text-3xl md:text-4xl">También te puede gustar</h2>
      <ProductGrid products={products} />
    </section>
  );
}
