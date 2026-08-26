import { Suspense } from 'react';
import type { Metadata } from 'next';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import ProductGrid from '@/components/grid/product-grid';
import CollectionNav from '@/components/layout/collection-nav';
import GridSkeleton from '@/components/grid/grid-skeleton';

export const metadata: Metadata = {
  title: 'Todo el catálogo',
  description: 'Pescados y mariscos disponibles hoy en Amor a Mar.',
};

export default function Page() {
  return (
    <Container className="py-10 md:py-16">
      <Heading as="h1" className="mb-10">
        Todo el catálogo
      </Heading>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[13rem_1fr] md:gap-14">
        <Suspense fallback={null}>
          <CollectionNav />
        </Suspense>

        <Suspense fallback={<GridSkeleton />}>
          <AllProducts />
        </Suspense>
      </div>
    </Container>
  );
}

async function AllProducts() {
  const { items, total } = await getProducts();

  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>
      <ProductGrid products={items} />
    </div>
  );
}
