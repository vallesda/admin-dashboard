import { Suspense } from 'react';

import { getProducts } from '@/lib/commerce';
import ProductGrid from '@/components/grid/product-grid';

/**
 * Home — commerce-first.
 *
 * This is the foundation slice: real products from the admin API, through the
 * `lib/commerce` seam. The editorial hero, occasion grid and merchandising
 * blocks come next; what matters first is that the chain works end to end.
 */
export default function Page() {
  return (
    <main>
      {/* Announcement bar — the brand green as a surface, not a background. */}
      <div className="bg-brand px-4 py-2 text-center text-sm text-background">
        Entrega refrigerada · Producto fresco seleccionado diariamente
      </div>

      <header className="mx-auto max-w-container px-4 py-10 md:px-8 md:py-16">
        <p className="font-sans text-sm uppercase tracking-[0.18em] text-muted">
          Amor a Mar
        </p>
        <h1 className="mt-4 max-w-[14ch] text-5xl leading-[0.95] md:text-7xl">
          Pescado extraordinario, del mar a tu mesa.
        </h1>
        <p className="mt-6 max-w-[48ch] text-lg text-muted">
          Selección fresca · Preparado para ti · Entrega refrigerada
        </p>
      </header>

      <section className="mx-auto max-w-container px-4 pb-24 md:px-8">
        <h2 className="mb-8 text-3xl md:text-4xl">Producto fresco</h2>
        <Suspense fallback={<GridSkeleton />}>
          <Catalogue />
        </Suspense>
      </section>
    </main>
  );
}

async function Catalogue() {
  const { items } = await getProducts();
  return <ProductGrid products={items} />;
}

function GridSkeleton() {
  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[4/5] animate-pulse rounded bg-sand" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-sand" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-sand" />
        </li>
      ))}
    </ul>
  );
}
