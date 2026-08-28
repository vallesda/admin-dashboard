import Image from 'next/image';
import Link from 'next/link';

import { getFeaturedProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Price from '@/components/ui/price';
import Section from '@/components/ui/section';

/**
 * The shop's own pick of what arrived — a curation, not a ranking.
 *
 * It used to be titled "Más vendidos", which asserts sales volume. The data
 * behind it is a `featured` flag someone sets by hand in the admin; there is no
 * order count anywhere in the system. That heading was the kind of claim the
 * brand's voice rule exists to prevent, and it took a rename, not a redesign,
 * to fix.
 *
 * It also renders only when there are at least three products to show. With
 * fewer, a three-column grid put one lonely tile in the left third under a
 * 48px heading and read as a section that failed to load — the first thing a
 * shopper saw after the hero.
 *
 * Rectangles, not circles. The circular crop was the most category-generic
 * gesture on the page and it broke the system's own corner rule; the 4:5 frame
 * matches the grid so the same photograph is not cropped two ways on one page.
 *
 * No ratings, no sales counts, no scarcity — the shop has no data for any of
 * them, and inventing it would be a lie dressed as social proof.
 */
export default async function BestSellers() {
  const products = await getFeaturedProducts(3);

  if (products.length < 3) return null;

  return (
    <Section labelledBy="seleccion-heading">
      <Container>
        <Heading id="seleccion-heading" className="mb-3">
          Nuestra selección de hoy
        </Heading>
        <p className="mb-12 max-w-[52ch] text-muted">
          Lo que elegimos personalmente de la captura de esta semana.
        </p>

        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link href={`/product/${product.handle}`} className="group block">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-sand">
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

                <h3 className="mt-4 font-sans text-lg font-medium">
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
    </Section>
  );
}
