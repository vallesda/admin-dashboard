import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import SectionHeader from '@/components/ui/section-header';
import SearchField from '@/components/ui/search-field';
import ProductGrid from '@/components/grid/product-grid';
import ResultRule from '@/components/grid/result-rule';
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
 *
 * The page reads top to bottom as one column now — title, search, rails, rule,
 * grid — rather than as a two-column layout with a sidebar. The rails moved
 * horizontal (see `CollectionNav`), and the grid took back the width they were
 * spending, which is a fourth column of product on any laptop.
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
      <SectionHeader
        as="h1"
        title={
          query ? (
            <>
              Resultados para <em>«{query}»</em>
            </>
          ) : (
            <>
              Todo el <em>catálogo</em>
            </>
          )
        }
        lede={
          query
            ? undefined
            : 'Lo que hay disponible ahora mismo. Cambia con lo que llega, así que lo que ves es lo que hay.'
        }
        className="mb-8"
      />

      <SearchField defaultValue={query} className="mb-10 max-w-md" />

      <div className="mb-10">
        <Suspense fallback={null}>
          <CollectionNav />
        </Suspense>
      </div>

      <Suspense key={query} fallback={<GridSkeleton />}>
        <AllProducts query={query} />
      </Suspense>
    </Container>
  );
}

async function AllProducts({ query }: { query: string }) {
  const { items, total } = await getProducts(query ? { query } : undefined);

  if (items.length === 0) {
    return (
      <div className="border-t border-border py-14">
        <p className="max-w-[46ch] text-muted">
          {query
            ? `No encontramos nada para «${query}». El catálogo cambia con lo que llega, así que puede que hoy no esté.`
            : 'Hoy no hay producto disponible. Vuelve a consultar: el catálogo se actualiza conforme llega la captura.'}
        </p>
        {query ? (
          <Link
            href="/search"
            className="-my-2 mt-6 inline-block border-b border-brand/40 py-2 text-sm text-brand transition-colors hover:border-brand"
          >
            Ver todo el catálogo
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <ResultRule total={total} />
      <ProductGrid products={items} />
    </div>
  );
}
