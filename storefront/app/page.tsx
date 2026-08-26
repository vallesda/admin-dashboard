import { Suspense } from 'react';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import ProductGrid from '@/components/grid/product-grid';
import Hero from '@/components/merchandising/hero';
import BestSellers from '@/components/merchandising/best-sellers';
import OccasionGrid from '@/components/merchandising/occasion-grid';
import CatchOfTheWeek from '@/components/merchandising/catch-of-the-week';
import TrustStrip from '@/components/merchandising/trust-strip';

/**
 * Home — commerce first.
 *
 * The colour rhythm is deliberate: cream carries most of the page so the two
 * green surfaces (hero, catch of the week) keep their weight. Making every
 * section green would cost the brand exactly the impact it is meant to have.
 *
 * A shopper meets a purchasable product immediately after the hero, before any
 * storytelling.
 */
export default function Page() {
  return (
    <>
      <Hero />

      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>

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

      <TrustStrip />
    </>
  );
}

async function Catalogue() {
  const { items } = await getProducts();
  return <ProductGrid products={items.slice(0, 8)} />;
}

function GridSkeleton() {
  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-sm bg-sand" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded-sm bg-sand" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded-sm bg-sand" />
        </li>
      ))}
    </ul>
  );
}
