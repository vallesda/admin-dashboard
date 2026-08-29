import { getProductRecommendations } from '@/lib/commerce';
import ProductGrid from '@/components/grid/product-grid';
import SectionHeader from '@/components/ui/section-header';

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
    <section aria-labelledby="relacionados-heading" className="mt-20 md:mt-28">
      <SectionHeader
        id="relacionados-heading"
        title={
          <>
            De la misma <em>categoría</em>
          </>
        }
        className="mb-10"
      />
      <ProductGrid products={products} />
    </section>
  );
}
