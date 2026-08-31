import Image from 'next/image';
import Link from 'next/link';

import { supplyOf, type Product } from '@/lib/commerce/types';
import { formatMoney, formatUnit } from '@/lib/format';
import ProductCartControl from '@/components/cart/product-cart-control';

/**
 * ProductCard — the component the storefront lives or dies by.
 *
 * Read as a fishmonger's board rather than as a tile: a photograph mounted
 * behind a hairline, then a rule, then the name and its price on one baseline,
 * then the one thing the shopper came to do.
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
 * ## Why the card is no longer a single link
 *
 * It used to be one `<Link>` wrapping everything, which is the simplest thing
 * that works right up until the card needs a second action — and a `<button>`
 * nested inside an `<a>` is invalid HTML that browsers resolve by swallowing
 * one of the two interactions.
 *
 * So the card is a positioned container, the product name carries the link, and
 * that link stretches an empty `::after` over the whole card. The photograph and
 * the price stay clickable, the accessible name of the link is the product name
 * rather than a paragraph of card text, and the Add button sits above the
 * overlay on its own stacking level. This is the standard shape for a card with
 * one primary destination and one secondary action, and it is the only one that
 * keeps both reachable by keyboard.
 *
 * ## Why the action is visible at rest
 *
 * The design system forbids hiding purchase information behind a hover, and the
 * same reasoning applies to the purchase *control*: a button that appears on
 * hover does not exist on a phone, which is most of this shop's traffic. It is
 * `secondary` rather than `primary` because eight saturated green buttons down a
 * catalogue page would outweigh the photography the grid is built to show.
 *
 * Once the product is in the basket that slot becomes the line's own quantity —
 * see `ProductCartControl`. Both states are 44px and full width, so a row of
 * cards never reflows as quantities change.
 */
export default function ProductCard({ product }: { product: Product }) {
  const meta = [product.presentation, product.origin]
    .filter(Boolean)
    .join(' · ');

  const soldOut = !product.availableForSale;
  const supply = supplyOf(product);

  /*
   * A product with real presentations cannot be added from a grid: the shopper
   * has not chosen one yet, and picking silently on their behalf is how someone
   * ends up with the wrong cut. Today the catalogue always returns exactly one
   * variant — a Product *is* the SKU, see the admin's DTO — so this branch is
   * inert. It exists so that the day variants land, the grid degrades to
   * "choose on the product page" instead of quietly adding the first option.
   */
  const needsChoice = product.variants.length > 1;

  return (
    <div className="group relative flex h-full flex-col">
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
        ) : supply.type === 'preorder' ? (
          /*
            Por encargo gana a «de temporada» cuando coinciden, y es lo correcto:
            de temporada describe el producto, por encargo cambia lo que le pasa
            a quien lo compra. Una sola etiqueta por tarjeta, y que sea la que
            altera la decisión.
          */
          <span className="absolute left-3 top-3 rounded-sm bg-foreground px-2 py-1 text-xs font-medium text-background">
            {supply.shortNotice ?? 'Por encargo'}
          </span>
        ) : product.seasonal ? (
          <span className="absolute left-3 top-3 rounded-sm bg-sun px-2 py-1 text-xs font-medium text-brand">
            De temporada
          </span>
        ) : supply.type === 'stocked' ? (
          <span className="absolute left-3 top-3 rounded-sm border border-border-strong bg-surface px-2 py-1 text-xs text-muted">
            Siempre disponible
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
            {/*
              The stretched `::after` is what keeps the whole card clickable now
              that it is not itself a link. `rounded-sm` on it so the focus ring
              traces the card rather than a bare rectangle.
            */}
            <Link
              href={`/product/${product.handle}`}
              className="rounded-sm after:absolute after:inset-0 after:content-['']"
            >
              {product.name}
            </Link>
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

      {/*
        `mt-auto` pins the action to the bottom of the card, so a row of cards
        with one- and two-line names still presents its buttons on a single
        line. `relative` lifts it out of the link's stretched overlay; without
        it every click on the button would navigate instead of adding.
      */}
      <div className="relative mt-auto pt-3">
        {needsChoice ? (
          <Link
            href={`/product/${product.handle}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded border border-border-strong bg-surface px-6 text-sm font-medium transition-colors duration-150 hover:bg-sand"
          >
            Elegir presentación
            <span className="sr-only"> de {product.name}</span>
          </Link>
        ) : (
          <ProductCartControl product={product} />
        )}
      </div>
    </div>
  );
}
