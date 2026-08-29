import Image from 'next/image';
import Link from 'next/link';

import { getFeaturedProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Price from '@/components/ui/price';
import Section from '@/components/ui/section';
import ProductCartControl from '@/components/cart/product-cart-control';
import SectionHeader from '@/components/ui/section-header';

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
 * Three across, not four, and each one gets its short description — that is the
 * whole difference between this row and the catalogue grid above it. This is
 * the shop talking about three pieces it chose; the grid is the inventory. If
 * the two rendered identically there would be no reason for both to exist.
 *
 * Rectangles, not circles. The circular crop was the most category-generic
 * gesture on the page and it broke the system's own corner rule; the 4:5 frame
 * matches the grid so the same photograph is not cropped two ways on one page.
 *
 * No ratings, no sales counts, no scarcity — the shop has no data for any of
 * them, and inventing it would be a lie dressed as social proof.
 *
 * It carries the same Add control as the catalogue grid. A shopper who is
 * offered three hand-picked pieces and then has to open each one to buy it is
 * being sent backwards; the row is merchandising, but what it merchandises is
 * still purchasable.
 */
export default async function BestSellers() {
  const products = await getFeaturedProducts(3);

  if (products.length < 3) return null;

  return (
    <Section labelledBy="seleccion-heading">
      <Container>
        <SectionHeader
          id="seleccion-heading"
          title={
            <>
              Nuestra <em>selección</em> de hoy
            </>
          }
          lede="Lo que elegimos personalmente de la captura de esta semana."
          className="mb-12"
        />

        <ul className="grid grid-cols-1 gap-10 sm:grid-cols-3 md:gap-8">
          {products.map((product) => (
            <li key={product.id} className="flex">
              {/* Same anatomy as `ProductCard`, and the same reason it is not a
                  single link: the Add button cannot live inside an anchor. The
                  product name carries the link and stretches over the card. */}
              <div className="group relative flex w-full flex-col">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-sand">
                  {product.featuredImage ? (
                    <Image
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText}
                      fill
                      sizes="(min-width: 640px) 30vw, 90vw"
                      className="object-cover transition-transform duration-500 ease-board group-hover:scale-[1.03]"
                    />
                  ) : null}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-sm plate"
                  />
                </div>

                <div className="mt-4 border-t border-border pt-3 transition-colors duration-200 group-hover:border-brand">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-sans text-base font-medium tracking-[-0.01em]">
                      <Link
                        href={`/product/${product.handle}`}
                        className="rounded-sm after:absolute after:inset-0 after:content-['']"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <span className="shrink-0 font-sans text-base font-medium">
                      <Price value={product.price} />
                    </span>
                  </div>
                  {product.shortDescription ? (
                    <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-muted">
                      {product.shortDescription}
                    </p>
                  ) : null}
                </div>

                <div className="relative mt-auto pt-4">
                  <ProductCartControl product={product} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
