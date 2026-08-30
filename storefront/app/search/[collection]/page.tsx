import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getCollections, getProducts, getShelf } from '@/lib/commerce';
import Container from '@/components/ui/container';
import SectionHeader from '@/components/ui/section-header';
import ProductGrid from '@/components/grid/product-grid';
import ResultRule from '@/components/grid/result-rule';
import CollectionNav from '@/components/layout/collection-nav';
import GridSkeleton from '@/components/grid/grid-skeleton';
import { RHYTHM } from '@/components/ui/section';

type Props = { params: Promise<{ collection: string }> };

/**
 * NOTE — no `loading.tsx` in this segment, for the same reason as the product
 * page: a route-level loading boundary commits a 200 before the page has
 * decided whether the collection exists, turning every unknown handle into a
 * soft 404 that search engines index as a live page.
 */

/**
 * Resolves a handle to a real category.
 *
 * It used to resolve to a category *or* a hardcoded "occasion" — Sashimi,
 * Ceviche — which had no data behind it, so those pages rendered the entire
 * catalogue under a note apologising for it. Occasions are packages now, they
 * live at `/paquete/[handle]`, and this route went back to doing one thing.
 *
 * A handle that is not a category but *is* a published package is redirected
 * rather than 404'd: those four URLs were live on this route until today, and
 * anyone holding one should land on the thing it became.
 */
async function resolve(handle: string) {
  const collections = await getCollections();
  return collections.find((c) => c.handle === handle);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection: handle } = await params;
  const found = await resolve(handle);

  if (!found) return { title: 'Colección no encontrada' };

  return {
    title: found.title,
    description: `${found.title} disponibles hoy en Amor a Mar.`,
  };
}

/**
 * A collection page: one category, filtered.
 *
 * It carries a plain ruled header rather than an editorial photograph, and that
 * is the distinction worth keeping. "Mariscos" is a filter; dressing a filter up
 * as a campaign is how a shop starts lying to itself about which of its pages
 * are merchandising. The proposition pages — "you are making ceviche" — are
 * packages, and they get the photograph.
 */
export default async function Page({ params }: Props) {
  const { collection: handle } = await params;
  const found = await resolve(handle);

  if (!found) {
    // The four occasion slugs used to answer on this route. If the handle is a
    // package now, send the visitor to it instead of a dead end.
    const shelf = await getShelf().catch(() => []);
    const bundle = shelf.find(
      (item) => item.kind === 'package' && item.handle === handle,
    );
    if (bundle) redirect(`/paquete/${handle}`);

    // Neither a category nor a package: a genuine 404, not an empty grid.
    notFound();
  }

  return (
    <Container className={RHYTHM.sm}>
      <SectionHeader as="h1" title={found.title} className="mb-10" />

      <div className="mb-10">
        <Suspense fallback={null}>
          <CollectionNav active={handle} />
        </Suspense>
      </div>

      <Suspense key={handle} fallback={<GridSkeleton />}>
        <CollectionProducts handle={handle} />
      </Suspense>
    </Container>
  );
}

async function CollectionProducts({ handle }: { handle: string }) {
  const { items, total } = await getProducts({ collection: handle });

  if (items.length === 0) {
    return (
      <div className="border-t border-border py-14">
        <p className="max-w-[46ch] text-muted">
          Hoy no hay nada en esta categoría. El catálogo cambia con lo que
          llega, así que vale la pena volver a consultar.
        </p>
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
