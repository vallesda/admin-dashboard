import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getProduct, supplyOf, type Product } from '@/lib/commerce';
import { SHOP_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/shop';
import { slugify } from '@/lib/slug';
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

  /*
   * La descripción se enriquece con lo que el catálogo ya sabe y no se estaba
   * usando: origen y presentación. Son exactamente los términos por los que
   * alguien busca —«atún aleta amarilla de Ensenada», «lomo limpio»— y estaban
   * guardados en la ficha sin llegar nunca al resultado de búsqueda.
   */
  const details = [product.presentation, product.origin]
    .filter(Boolean)
    .join(' · ');

  const description = [product.seo.description, details]
    .filter(Boolean)
    .join(' ')
    .slice(0, 300);

  return {
    title: product.seo.title,
    description: description || undefined,
    // Una URL por contenido. Sin canónica, el mismo producto alcanzable desde
    // dos rutas compite consigo mismo.
    alternates: { canonical: `/product/${handle}` },
    openGraph: {
      type: 'website',
      title: product.seo.title,
      description: description || undefined,
      url: `/product/${handle}`,
      images: product.featuredImage
        ? [{ url: product.featuredImage.url, alt: product.featuredImage.altText }]
        : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-container px-5 py-8 md:px-8 md:py-12">
      <ProductJsonLd product={product} />

      <nav
        aria-label="Ruta de navegación"
        className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted"
      >
        <Link href="/search" className="-my-2 py-2 hover:text-brand">
          Productos
        </Link>
        <span aria-hidden="true">/</span>
        {/* The category step is what makes this a trail rather than a back
            button. A shopper who arrived from a collection can return to it,
            and one who arrived from search finds it for the first time. */}
        {product.category ? (
          <>
            <Link
              href={`/search/${slugify(product.category)}`}
              className="-my-2 py-2 hover:text-brand"
            >
              {product.category}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* 60/40 on desktop: photography sells, the panel closes. One column on
          mobile, gallery first.

          `items-start` is what lets the panel stick: a stretched grid item is
          already the full height of its row, and `position: sticky` on a box
          with nowhere to travel does nothing. It sticks below the 80px header
          plus a little air, so the price and the Add to Cart button stay
          reachable while the shopper reads down a tall photograph. */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
        <Gallery
          images={product.images}
          name={product.name}
          supply={supplyOf(product)}
        />
        <div className="lg:sticky lg:top-28">
          <ProductDescription product={product} />
        </div>
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
 * Turns a category name into the handle its collection page answers to.
 *
 * The catalogue returns a display name ("Producto Fresco") and the route wants
 * a slug ("producto-fresco"). Deriving it here rather than adding a field keeps
 * the API contract unchanged; if the admin ever returns the handle directly,
 * this is one function to delete.
 *
 * `normalize('NFD')` plus the combining-marks strip is what makes "Pescados y
 * Mariscos" and an accented category resolve the same way the admin slugged
 * them. An unknown handle still lands on a real 404 rather than an empty grid.
 */

/**
 * Product structured data.
 *
 * `availability` mirrors what the page says, so a search result never advertises
 * something the shop cannot sell.
 */
function ProductJsonLd({ product }: { product: Product }) {
  const url = `${SITE_URL}/product/${product.handle}`;

  /*
   * La ficha estaba a medias: sin `sku`, sin `brand`, sin `offers.url` y sin
   * `itemCondition`, Google no la considera elegible para resultado
   * enriquecido — que es todo el motivo de escribirla.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#producto`,
    name: product.name,
    description: product.seo.description ?? undefined,
    image: product.images.map((i) => i.url),
    /*
     * El `handle` como identificador, no el SKU interno.
     *
     * `sku` en schema.org sólo pide un identificador estable del comerciante, y
     * el handle ya lo es y ya es público. Exponer el SKU del almacén sería
     * filtrar vocabulario interno a cambio de nada — si algún día hace falta
     * para Merchant Center, se agrega al DTO a conciencia.
     */
    sku: product.handle,
    brand: { '@type': 'Brand', name: SHOP_NAME },
    ...(product.origin ? { countryOfOrigin: product.origin } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: product.price.currency,
      price: (product.price.amountCents / 100).toFixed(2),
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.availableForSale
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SHOP_NAME },
      /*
       * Falta `priceValidUntil`, y es deliberado.
       *
       * Google lo recomienda, pero calcularlo aquí significa leer la hora
       * durante el render, que es impuro y que el linter caza con razón: React
       * puede volver a renderizar y obtener otra respuesta. Su sitio correcto es
       * el bloque `seo` que ya arma el admin, fuera de React por completo.
       * Queda anotado en DOCS/SEO.md en vez de resuelto con una supresión.
       */
    },
  };

  const trail = breadcrumbJsonLd([
    { name: 'Catálogo', path: '/search' },
    { name: product.name, path: `/product/${product.handle}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* La ruta que sale bajo el resultado de búsqueda, en lugar de la URL
          cruda. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trail) }}
      />
    </>
  );
}
