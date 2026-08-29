import Image from 'next/image';

import type { ProductImage } from '@/lib/commerce/types';

/**
 * Product gallery.
 *
 * A Server Component: with one image per product there is nothing to select, so
 * shipping a client bundle to render a single photo would be waste. When the
 * catalogue supports multiple images, this becomes a client component with
 * thumbnail state — and nothing else on the page changes.
 *
 * The frame is 4:5 rather than square, matching the grid card the shopper
 * arrived from. A square hero cropped the same photograph a second way, so a
 * fish that filled its card arrived on its own page with its tail cut off.
 */
export default function Gallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const primary = images[0];

  return (
    <div>
      {/* 4:5 on a phone, where a tall frame suits both the product and the
          viewport, and square from `lg`, where the panel beside it is about
          620px tall — a 4:5 crop at 60% of a 1360px container is over 900px and
          left a third of the purchase column empty. Two crops, one reason:
          neither should leave a void next to the Add to Cart button. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand lg:aspect-square">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.altText || name}
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Sin imagen
          </div>
        )}

        {/* Mounted like every other photograph in the shop. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-sm plate"
        />
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image) => (
            <li
              key={image.url}
              className="relative aspect-square overflow-hidden rounded-sm bg-sand"
            >
              <Image
                src={image.url}
                alt={image.altText || name}
                fill
                sizes="12vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-sm plate"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
