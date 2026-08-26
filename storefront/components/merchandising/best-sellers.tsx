import Image from 'next/image';
import Link from 'next/link';

import { getFeaturedProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Price from '@/components/ui/price';

/**
 * The first purchasable products on the page.
 *
 * Circular crops here and only here: the editorial treatment earns its place
 * because this row is a curation, not a comparison. The grid below uses
 * consistent rectangles precisely because that one *is* a comparison.
 *
 * No ratings, no sales counts, no scarcity — the shop has no data for any of
 * them, and inventing it would be a lie dressed as social proof.
 */
export default async function BestSellers() {
  const products = await getFeaturedProducts(3);

  if (products.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <Container>
        <Heading className="mb-12">Más vendidos</Heading>

        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/product/${product.handle}`} className="group block text-center">
                <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-full bg-sand">
                  {product.featuredImage ? (
                    <Image
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText}
                      fill
                      sizes="(min-width: 640px) 22vw, 80vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>

                <h3 className="mt-6 font-sans text-lg font-medium">
                  {product.name}
                </h3>
                {product.shortDescription ? (
                  <p className="mt-1 text-sm text-muted">
                    {product.shortDescription}
                  </p>
                ) : null}
                <p className="mt-3">
                  <Price value={product.price} unit={product.unit} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
