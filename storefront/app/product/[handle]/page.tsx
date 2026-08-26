import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getProduct, type Product } from '@/lib/commerce';
import Gallery from '@/components/product/gallery';
import ProductDescription from '@/components/product/product-description';
import ProductDetails from '@/components/product/product-details';
import RelatedProducts from '@/components/product/related-products';

type Props = { params: Promise<{ handle: string }> };

/**
 * NOTE — there is deliberately no `loading.tsx` in this segment.
 *
 * A route-level loading boundary makes Next stream the shell immediately, which
 * commits a 200 status before the page has decided anything. A product that no
 * longer exists would then answer 200 with "not found" content — a soft 404
 * that search engines keep indexing as a live page, which for a catalogue that
 * archives products regularly is a real cost.
 *
 * Measured: with `loading.tsx`, a missing handle returned 200; without it, 404.
 *
 * The trade is a skeleton on first paint, and it is a cheap one — the catalogue
 * response is cached for 60s. Streaming still happens where it costs nothing:
 * `RelatedProducts` sits behind its own Suspense boundary below.
 */

/**
 * Per-product metadata.
 *
 * The API returns an `seo` block built from the product's own copy, so titles
 * and descriptions are whatever the shop wrote in the admin — not a template
 * with the name interpolated into it.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) return { title: 'Producto no encontrado' };

  return {
    title: product.seo.title,
    description: product.seo.description ?? undefined,
    openGraph: product.featuredImage
      ? {
          images: [
            {
              url: product.featuredImage.url,
              alt: product.featuredImage.altText,
            },
          ],
        }
      : undefined,
  };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-container px-5 py-8 md:px-8 md:py-12">
      <ProductJsonLd product={product} />

      <nav aria-label="Ruta de navegación" className="mb-8 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Productos
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* 60/40 on desktop: photography sells, the panel closes. One column on
          mobile, gallery first. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:gap-14">
        <Gallery images={product.images} name={product.name} />
        <ProductDescription product={product} />
      </div>

      <ProductDetails product={product} />

      {/* Streams separately: the purchase panel must never wait on this. */}
      <Suspense fallback={null}>
        <RelatedProducts handle={product.handle} />
      </Suspense>
    </div>
  );
}

/**
 * Product structured data.
 *
 * `availability` mirrors what the page says, so a search result never advertises
 * something the shop cannot sell.
 */
function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.seo.description ?? undefined,
    image: product.images.map((i) => i.url),
    ...(product.origin ? { countryOfOrigin: product.origin } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: product.price.currency,
      price: (product.price.amountCents / 100).toFixed(2),
      availability: product.availableForSale
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
