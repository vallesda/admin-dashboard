import { Suspense } from 'react';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
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
 * Home — commerce first.
 *
 * The colour rhythm is deliberate: cream carries most of the page so the two
 * green surfaces (hero, catch of the week) keep their weight. Making every
 * section green would cost the brand exactly the impact it is meant to have.
 *
 * A shopper meets a purchasable product immediately after the hero, before any
 * storytelling. That ordering survives the editorial sections added since: the
 * four reasons to buy come AFTER the first products, and the story about the
 * sea comes after the whole catalogue. Someone who arrived to buy fish should
 * never have to scroll past a manifesto to reach one.
 */
export default function Page() {
  return (
    <>
      <Hero />

      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>

      <ValueProps />

      <section id="producto-fresco" className="scroll-mt-24 pb-16 md:pb-24">
        <Container>
          <Heading className="mb-3">Producto fresco</Heading>
          <p className="mb-10 max-w-[52ch] text-muted">
            Todo lo que está disponible hoy, con su presentación y su origen.
          </p>
          <Suspense fallback={<GridSkeleton />}>
            <Catalogue />
          </Suspense>
        </Container>
      </section>

      <OccasionGrid />

      <Suspense fallback={null}>
        <CatchOfTheWeek />
      </Suspense>

      <About />

      <HowItWorks />
    </>
  );
}

async function Catalogue() {
  const { items } = await getProducts();
  return <ProductGrid products={items.slice(0, 8)} />;
}

