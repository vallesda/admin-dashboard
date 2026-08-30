import Image from 'next/image';
import Link from 'next/link';

import type { ShelfItem } from '@/lib/commerce/types';

/**
 * One tile on the home shelf.
 *
 * Photography leads and the type sits inside the frame, which is what separates
 * these from the product cards elsewhere on the page: a product card mounts its
 * photograph and puts its facts on a rule underneath; a shelf tile *is* the
 * photograph.
 *
 * The scrim underneath the text is not a decorative gradient — without it the
 * title fails contrast over a bright plate. It deepens on hover, which is also
 * when the label is actually being read.
 *
 * A package says how many pieces it holds. A category does not: its count
 * changes with the catch and a number that moves every morning is noise, while
 * "4 piezas" on a bundle is the thing that makes it read as a bundle.
 */
export default function ShelfCard({ item }: { item: ShelfItem }) {
  const href =
    item.kind === 'package'
      ? `/paquete/${item.handle}`
      : `/search/${item.handle}`;

  return (
    <Link
      href={href}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-sm"
    >
      {item.image ? (
        <>
          <Image
            src={item.image.url}
            alt={item.image.altText}
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform duration-500 ease-board group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand" />
      )}

      {/* Mounted like every other photograph in the shop. The on-brand variant
          because an ink hairline vanishes into a dark scrim. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-sm plate-on-brand"
      />

      <div className="relative p-4 md:p-5">
        {/* The rule grows from nothing to full width on hover: the card's whole
            affordance, drawn in the same vocabulary as the product card's. */}
        <span
          aria-hidden="true"
          className="block h-px w-8 bg-background/60 transition-all duration-500 ease-board group-hover:w-full group-hover:bg-background"
        />
        <h3 className="mt-3 font-display text-2xl font-light leading-tight text-background md:text-3xl">
          {item.title}
        </h3>

        {item.tagline ? (
          <p className="mt-1 text-sm text-background/85">{item.tagline}</p>
        ) : null}

        {item.kind === 'package' && item.itemCount ? (
          <p className="mt-1 text-xs tabular-nums text-background/70">
            Paquete · {item.itemCount}{' '}
            {item.itemCount === 1 ? 'pieza' : 'piezas'}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
