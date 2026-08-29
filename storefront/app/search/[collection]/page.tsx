import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getCollections, getProducts } from '@/lib/commerce';
import { findOccasion } from '@/lib/occasions';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
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
 * Resolves a handle to either a real category or a merchandising occasion.
 *
 * The two are different things and the page has to say so. A category filters
 * the catalogue; an occasion is a promise the data cannot keep yet, because the
 * admin has no notion of "sashimi" — it will, and then this collapses to one
 * branch.
 */
async function resolve(handle: string) {
  const collections = await getCollections();
  const collection = collections.find((c) => c.handle === handle);

  if (collection) return { kind: 'collection' as const, collection };

  const occasion = findOccasion(handle);
  if (occasion) return { kind: 'occasion' as const, occasion };

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection: handle } = await params;
  const found = await resolve(handle);

  if (!found) return { title: 'Colección no encontrada' };

  const title =
    found.kind === 'collection' ? found.collection.title : found.occasion.title;

  return {
    title,
    description:
      found.kind === 'occasion'
        ? found.occasion.description
        : `${title} disponibles hoy en Amor a Mar.`,
  };
}

/**
 * A collection page.
 *
 * The two kinds of header are deliberately different weights of the same thing.
 * An occasion has an editorial photograph behind it because it is a proposition
 * — "you are making ceviche" — and a category does not, because "Mariscos" is a
 * filter and dressing a filter up as a campaign is how a shop starts lying to
 * itself about which of its pages are merchandising.
 *
 * What they now share is everything below: the same rails, the same rule, the
 * same grid at the same width. Before, a category page opened on a bare `<h1>`
 * against cream while an occasion opened on a full-bleed photograph, and the
 * two read as pages from different sites.
 */
export default async function Page({ params }: Props) {
  const { collection: handle } = await params;
  const found = await resolve(handle);

  // Neither a category nor a known occasion: a genuine 404, not an empty grid.
  if (!found) notFound();

  const title =
    found.kind === 'collection' ? found.collection.title : found.occasion.title;

  return (
    <Container className={RHYTHM.sm}>
      {found.kind === 'occasion' ? (
        <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-sm sm:aspect-[16/7] md:aspect-[21/6]">
          <Image
            src={found.occasion.image.url}
            alt={found.occasion.image.altText}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Scrim, not decoration: the title fails contrast over a bright
              plate without it. */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-sm plate-on-brand"
          />

          <div className="absolute inset-x-0 bottom-0 p-5 md:p-10">
            <span
              aria-hidden="true"
              className="block h-px w-10 bg-background/70"
            />
            <Heading as="h1" className="mt-4 text-background">
              {title}
            </Heading>
            <p className="mt-2 max-w-[44ch] text-background/85">
              {found.occasion.description}
            </p>
          </div>
        </div>
      ) : (
        <SectionHeader as="h1" title={title} className="mb-10" />
      )}

      <div className="mb-10">
        <Suspense fallback={null}>
          <CollectionNav active={handle} />
        </Suspense>
      </div>

      <Suspense key={handle} fallback={<GridSkeleton />}>
        {found.kind === 'collection' ? (
          <CollectionProducts handle={handle} />
        ) : (
          <OccasionProducts title={title} />
        )}
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

/**
 * An occasion has no filter behind it yet, so the page shows the full catalogue
 * and says why.
 *
 * The alternative — an empty grid under a beautiful photograph — reads as a
 * broken shop. Sending the shopper to everything we sell keeps them buying
 * while the curation is still being built, and the note is honest about what
 * they are looking at.
 *
 * The note sits on Verde Espuma rather than on the elevated cream surface it
 * used before. It is the one informational aside on the page and it has to be
 * distinguishable from the product surfaces around it — which is exactly the
 * job the design system gives that token.
 */
async function OccasionProducts({ title }: { title: string }) {
  const { items, total } = await getProducts();

  return (
    <div>
      <p className="mb-8 rounded-sm bg-brand-soft px-4 py-3 text-sm text-foreground">
        Todavía estamos armando la selección de{' '}
        <span className="font-medium">{title}</span>. Mientras tanto, esto es
        todo lo que tenemos disponible hoy.
      </p>

      <ResultRule total={total} />
      <ProductGrid products={items} />
    </div>
  );
}
