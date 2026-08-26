import Image from 'next/image';

import type { ProductImage } from '@/lib/commerce/types';

/**
 * Product gallery.
 *
 * A Server Component: with one image per product there is nothing to select, so
 * shipping a client bundle to render a single photo would be waste. When the
 * catalogue supports multiple images, this becomes a client component with
 * thumbnail state — and nothing else on the page changes.
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
      <div className="relative aspect-square overflow-hidden rounded bg-sand">
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
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image) => (
            <li
              key={image.url}
              className="relative aspect-square overflow-hidden rounded bg-sand"
            >
              <Image
                src={image.url}
                alt={image.altText || name}
                fill
                sizes="12vw"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
