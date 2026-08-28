import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getCollections, getProducts } from '@/lib/commerce';
import { findOccasion } from '@/lib/occasions';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import ProductGrid from '@/components/grid/product-grid';
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
        <div className="relative mb-10 aspect-[16/7] overflow-hidden rounded-sm md:aspect-[21/6]">
          <Image
            src={found.occasion.image.url}
            alt={found.occasion.image.altText}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-0 p-6 md:p-10">
            <Heading as="h1" className="text-background">
              {title}
            </Heading>
            <p className="mt-2 max-w-[44ch] text-background/85">
              {found.occasion.description}
            </p>
          </div>
        </div>
      ) : (
        <Heading as="h1" className="mb-10">
          {title}
        </Heading>
      )}

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[13rem_1fr] md:gap-14">
        <Suspense fallback={null}>
          <CollectionNav active={handle} />
        </Suspense>

        <Suspense key={handle} fallback={<GridSkeleton />}>
          {found.kind === 'collection' ? (
            <CollectionProducts handle={handle} />
          ) : (
            <OccasionProducts title={title} />
          )}
        </Suspense>
      </div>
    </Container>
  );
}

async function CollectionProducts({ handle }: { handle: string }) {
  const { items, total } = await getProducts({ collection: handle });

  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>
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
 */
async function OccasionProducts({ title }: { title: string }) {
  const { items, total } = await getProducts();

  return (
    <div>
      <div className="mb-6 rounded-sm border border-border bg-surface px-4 py-3">
        <p className="text-sm">
          Todavía estamos armando la selección de{' '}
          <span className="font-medium">{title}</span>. Mientras tanto, esto es
          todo lo que tenemos disponible hoy.
        </p>
      </div>

      <p className="mb-6 text-sm text-muted">
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>
      <ProductGrid products={items} />
    </div>
  );
}
