import Image from 'next/image';
import Link from 'next/link';

import type { Occasion } from '@/lib/occasions';

/**
 * One shopping intent.
 *
 * Photography leads and the type sits inside the frame, which is what separates
 * these from the product cards directly above them: a product card mounts its
 * photograph and puts its facts on a rule underneath, an occasion card is the
 * photograph. Two different objects on one page have to look like two different
 * objects.
 *
 * The scrim underneath the text is not a decorative gradient — without it the
 * title fails contrast over a bright plate. It deepens on hover, which is also
 * what makes the label legible at the moment the shopper is actually reading it.
 */
export default function OccasionCard({ occasion }: { occasion: Occasion }) {
  return (
    <Link
      href={`/search/${occasion.handle}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-sm"
    >
      {occasion.image ? (
        <>
          <Image
            src={occasion.image.url}
            alt={occasion.image.altText}
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
          {occasion.title}
        </h3>
        <p className="mt-1 text-sm text-background/85">
          {occasion.description}
        </p>
      </div>
    </Link>
  );
}
