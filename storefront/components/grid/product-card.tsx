import Image from 'next/image';
import Link from 'next/link';

import type { Product } from '@/lib/commerce/types';
import { formatMoney, formatUnit } from '@/lib/format';

/**
 * ProductCard — the component the storefront lives or dies by.
 *
 * Read as a fishmonger's board rather than as a tile: a photograph mounted
 * behind a hairline, then a rule, then the name and its price on one baseline.
 *
 * The two-column baseline row is the whole idea. Price used to sit two lines
 * below the name on the left, which meant that scanning a grid of eight
 * products for "what can I afford" was eight separate reads at eight different
 * x-positions. Pinned right, the prices form a single column down the page and
 * `tabular-nums` keeps the digits from shifting between rows — which is the
 * only thing a collection page has to make easy.
 *
 * Presentation and origin drop to the second baseline under the name, still
 * paired with the unit under the price. Those two facts are what separates a
 * loin from a fillet of the same fish, so they stay on the card and are not
 * demoted to the product page.
 *
 * A Server Component — it has no interaction of its own.
 */
export default function ProductCard({ product }: { product: Product }) {
  const meta = [product.presentation, product.origin]
    .filter(Boolean)
    .join(' · ');

  const soldOut = !product.availableForSale;

  return (
    <Link href={`/product/${product.handle}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand">
        {product.featuredImage ? (
          <Image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            // The scale is small and slow on purpose: the photograph is the
            // product, and a card that lunges at the cursor draws attention to
            // the interaction instead of to the fish.
            className={`object-cover transition-transform duration-500 ease-board group-hover:scale-[1.03] ${
              soldOut ? 'grayscale-[0.4]' : ''
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Sin imagen
          </div>
        )}

        {/* The mount. Drawn over the photograph rather than around it, so the
            4:5 frame stays exactly 4:5 and the line survives the crop. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-sm plate"
        />

        {/* Availability is a word, never only a dimmed image: colour and
            desaturation alone would not survive greyscale or bright sunlight.
            The grey above is a second channel on top of this, not instead of
            it — the two states never coexist. */}
        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-sm bg-foreground/85 px-2 py-1 text-xs text-background backdrop-blur-[2px]">
            Agotado
          </span>
        ) : product.seasonal ? (
          <span className="absolute left-3 top-3 rounded-sm bg-gold px-2 py-1 text-xs font-medium text-foreground">
            De temporada
          </span>
        ) : null}
      </div>

      {/* The rule is the card's affordance. It runs the full width in the
          divider tone and turns brand on hover, which reads as the row being
          picked out on a board — and unlike a shadow or a lift it costs the
          layout nothing. */}
      <div className="mt-4 border-t border-border pt-3 transition-colors duration-200 group-hover:border-brand">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-sans text-base font-medium leading-snug tracking-[-0.01em]">
            {product.name}
          </h3>
          <span className="shrink-0 font-sans text-base font-medium tabular-nums">
            {formatMoney(product.price)}
          </span>
        </div>

        {/* Collapses when the admin has filled in neither field. The old
            fallback rendered a non-breaking space, so an incomplete card showed
            a blank line and read as broken rather than simply shorter. */}
        {meta || product.unit ? (
          <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted">
            <p className="min-w-0">{meta}</p>
            {product.unit ? (
              <span className="shrink-0 tabular-nums">
                / {formatUnit(product.unit)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
