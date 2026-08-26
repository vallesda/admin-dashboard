import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/lib/commerce/types';
import Price from '@/components/ui/price';

/**
 * ProductCard — the component the storefront lives or dies by.
 *
 * Optimised for scanning, not for decoration: consistent image ratio, price
 * always visible, nothing important hidden behind hover. Photography does the
 * selling; the card gets out of the way.
 *
 * A Server Component — it has no interaction of its own.
 */
export default function ProductGridItem({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.handle}`}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded bg-sand">
        {product.featuredImage ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Sin imagen
          </div>
        )}

        {!product.availableForSale ? (
          <span className="absolute left-2 top-2 rounded bg-foreground/85 px-2 py-1 text-xs text-background">
            Agotado
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <h3 className="font-sans text-base font-medium leading-snug">
          {product.name}
        </h3>

        {/* Presentation and origin are the differentiators a shopper actually
            compares between two cuts of the same fish. */}
        <p className="mt-1 text-sm text-muted">
          {[product.presentation, product.origin].filter(Boolean).join(' · ') ||
            ' '}
        </p>

        <p className="mt-2 text-base">
          <Price value={product.price} unit={product.unit} />
        </p>
      </div>
    </Link>
  );
}
