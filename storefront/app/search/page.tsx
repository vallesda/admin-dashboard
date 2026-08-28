import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import SearchField from '@/components/ui/search-field';
import ProductGrid from '@/components/grid/product-grid';
import CollectionNav from '@/components/layout/collection-nav';
import GridSkeleton from '@/components/grid/grid-skeleton';
import { RHYTHM } from '@/components/ui/section';

export const metadata: Metadata = {
  title: 'Todo el catálogo',
  description: 'Pescados y mariscos disponibles hoy en Amor a Mar.',
};

/**
 * The catalogue.
 *
 * Search is server-side: the query arrives as `?q=`, goes to the same catalogue
 * endpoint the rest of the storefront uses, and the results render on the
 * server. Nothing about it needs client state, so it does not have any.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return (
    <Container className={RHYTHM.sm}>
      <Heading as="h1" className="mb-6">
        {query ? `Resultados para «${query}»` : 'Todo el catálogo'}
      </Heading>

      <SearchField defaultValue={query} className="mb-10 max-w-md" />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[13rem_1fr] md:gap-14">
        <Suspense fallback={null}>
          <CollectionNav />
        </Suspense>

        <Suspense key={query} fallback={<GridSkeleton />}>
          <AllProducts query={query} />
        </Suspense>
      </div>
    </Container>
  );
}

async function AllProducts({ query }: { query: string }) {
  const { items, total } = await getProducts(
    query ? { query } : undefined,
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-10">
        <p className="text-muted">
          {query
            ? `No encontramos nada para «${query}». El catálogo cambia con lo que llega, así que puede que hoy no esté.`
            : 'Hoy no hay producto disponible.'}
        </p>
        {query ? (
          <Link
            href="/search"
            className="-my-2 inline-block border-b border-brand/40 py-2 text-sm text-brand transition-colors hover:border-brand"
          >
            Ver todo el catálogo
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>
      <ProductGrid products={items} />
    </div>
  );
}
