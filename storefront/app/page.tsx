import { Suspense } from 'react';
import Link from 'next/link';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import Heading from '@/components/ui/heading';
import ProductGrid from '@/components/grid/product-grid';
import GridSkeleton from '@/components/grid/grid-skeleton';
import Hero from '@/components/merchandising/hero';
import BestSellers from '@/components/merchandising/best-sellers';
import OccasionGrid from '@/components/merchandising/occasion-grid';
import CatchOfTheWeek from '@/components/merchandising/catch-of-the-week';
import ValueProps from '@/components/merchandising/value-props';
import About from '@/components/merchandising/about';
import HowItWorks from '@/components/merchandising/how-it-works';

/**
 * Home — commerce first, and now it actually is.
 *
 * The old order put a merchandised row and a four-reason strip between the hero
 * and the first thing a shopper could buy, then sent the hero's own CTA to an
 * anchor that scrolled past both. Someone who arrived to buy fish met two
 * sections of persuasion first. The catalogue now sits immediately under the
 * hero, and everything that explains the shop comes after it.
 *
 * The colour rhythm is deliberate: cream carries most of the page so the two
 * brand-green surfaces — the hero and the catch of the week — keep their
 * weight. About used to be a third green block directly after the second, which
 * put four diagonal cuts across two consecutive sections and pushed green well
 * past the share the design system gives it. It is cream now, and the diagonal
 * is back to being a signature instead of a pattern.
 *
 * Section order, and why:
 *   1. Hero            — where the fish comes from, in one photograph
 *   2. Catalogue       — the purchasable thing, before any argument for it
 *   3. Occasions       — the "por ocasión" shopper's own way of choosing
 *   4. Catch           — one green moment, the week's pick
 *   5. Value props     — why this shop, once there is something to want
 *   6. How it works    — the volatile catalogue and no-online-payment explained
 *   7. Selection       — the shop's hand-picked row, when there is one
 *   8. About           — the story, last, for whoever is still reading
 */
export default function Page() {
  return (
    <>
      <Hero />

      <Section id="producto-fresco" labelledBy="catalogo-heading">
        <Container>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <Heading id="catalogo-heading" className="mb-3">
                Lo que hay hoy
              </Heading>
              <p className="max-w-[52ch] text-muted">
                El catálogo cambia con lo que llega. Todo lo disponible ahora,
                con su presentación y su origen.
              </p>
            </div>

            {/* The grid is capped, so the way out of it has to be visible.
                Without this the only route to the full catalogue from the body
                of the page was a text link buried in the story section. */}
            <Link
              href="/search"
              className="-my-2 inline-block shrink-0 border-b border-brand/40 py-2 text-sm text-brand transition-colors hover:border-brand"
            >
              Ver todo el catálogo
            </Link>
          </div>

          <Suspense fallback={<GridSkeleton />}>
            <Catalogue />
          </Suspense>
        </Container>
      </Section>

      <OccasionGrid />

      <Suspense fallback={null}>
        <CatchOfTheWeek />
      </Suspense>

      <ValueProps />

      <HowItWorks />

      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>

      <About />
    </>
  );
}

async function Catalogue() {
  const { items } = await getProducts();
  return <ProductGrid products={items.slice(0, 8)} />;
}
