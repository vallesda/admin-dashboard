import { Suspense } from 'react';
import Image from 'next/image';

import { getProducts } from '@/lib/commerce';
import Heading from '@/components/ui/heading';
import { ButtonLink } from '@/components/ui/button';

/**
 * Hero — the board above the counter.
 *
 * Photography on one side, a brand-green block on the other, with a diagonal
 * where they meet. That composition and that diagonal are the system's
 * signature and they stay. What changed is what the green block *says*.
 *
 * It used to open with a headline and a subhead and nothing else, which made it
 * a poster: handsome, and true of any fishmonger anywhere. The design system's
 * north star is "La Captura del Día" — the shop's catalogue is a record of what
 * the sea gave today, and a piece that sells out simply stops existing — and
 * none of that was visible on the page it was supposed to be organising.
 *
 * So the block is now dated and counted. A masthead rule carries today's date;
 * a footer rule carries what is actually in the catalogue right now, by
 * category. Both are read from real data or from the clock — no claim, no
 * schedule, nothing the business has not established. It is the difference
 * between a shop that says it is fresh and a shop that shows you today's board.
 *
 * The headline says what the shop does, not how good it is. "Pescado
 * extraordinario" was a superlative the brand's own voice rule forbids, and it
 * was doing no work the photograph wasn't already doing better.
 *
 * "Cocina" is set in gold — the emphasis colour for the stressed noun of a
 * display heading on brand green. It is the word the whole sentence turns on:
 * the promise is not the boat and not the trip, it is that the fish arrives in
 * the shopper's own kitchen. Gold on the brand green measures 4.20:1 and the
 * headline is display-sized, so the 3:1 threshold is the one that applies.
 *
 * The CTA goes to the full catalogue rather than to an anchor further down this
 * page: an anchor scrolled the shopper PAST the first purchasable products,
 * which inverts the "buy first, story later" principle it was meant to serve.
 *
 * The hero still does not *wait* on data. The date is free, and the tally sits
 * behind its own Suspense boundary with a reserved-height fallback, so the
 * first paint is the photograph and the headline exactly as before — the row
 * fills in underneath without moving anything above it.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative bg-background">
      <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr]">
        {/* Photography */}
        <div className="relative order-1 aspect-[4/3] md:order-2 md:aspect-auto md:min-h-[36rem]">
          <Image
            src="/editorial/hero-barco.jpg"
            alt="Barco pesquero navegando al amanecer"
            fill
            priority
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover"
          />
        </div>

        {/* Brand surface. The diagonal lives on this block so the photograph
            keeps its full frame. */}
        {/* `md:edge-none` used to sit here and was never a real utility — no
            such class is defined, so it resolved to nothing and the diagonal
            applied at every width regardless. Which is the right result: the
            angle is the brand's signature and belongs on desktop most of all.
            Removed rather than defined, so nobody "fixes" it into existence and
            deletes the cut. The mobile step-down is handled by the media query
            inside `.edge-top` itself. */}
        <div className="order-2 flex flex-col bg-brand text-background edge-top md:order-1">
          <div className="flex flex-1 flex-col px-5 py-12 md:py-20 md:pl-8 md:pr-14 lg:pl-[max(2rem,calc((100vw-var(--container))/2+2rem))]">
            <CatalogueDate />

            {/* The animation rides a wrapper rather than a `style` prop on
                `Heading`: the type scale component owns sizing, and widening
                its API to carry a delay would put presentation state in the
                one file the system keeps free of it. */}
            <div className="mt-8 set-down" style={{ animationDelay: '90ms' }}>
              <Heading
                id="hero-heading"
                as="h1"
                size="hero"
                // 13ch puts the break after "cocina", so the line that lands
                // alone is the one that carries the promise.
                className="max-w-[13ch]"
              >
                Del barco a tu <em className="text-gold">cocina</em>, sin
                escala.
              </Heading>
            </div>

            <p
              className="mt-6 max-w-[38ch] text-lg text-background/85 set-down"
              style={{ animationDelay: '180ms' }}
            >
              Selección fresca, preparada para ti y entregada con cadena de
              frío.
            </p>

            <div className="set-down" style={{ animationDelay: '270ms' }}>
              <ButtonLink
                href="/search"
                variant="onBrand"
                className="mt-9"
              >
                Ver lo que hay hoy
              </ButtonLink>
            </div>

            {/* Pushes the tally to the bottom of the block on desktop, where it
                reads as the board's footer rather than as a fourth paragraph. */}
            <div className="mt-12 md:mt-auto md:pt-16">
              <Suspense fallback={<TallyFallback />}>
                <CatalogueTally />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Today's date, as the catalogue's masthead.
 *
 * The time zone is pinned to Monterrey rather than left to the server's. The
 * shop and every one of its customers are in Nuevo León; a Vercel function
 * running in UTC would roll the date over at 6pm local and tell a shopper on
 * Friday evening that they are looking at Saturday's board.
 *
 * This is a statement about the catalogue, not a delivery promise — the one
 * thing the business has not defined and this file must not invent.
 */
function CatalogueDate() {
  const today = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Monterrey',
  }).format(new Date());

  return (
    <p className="flex items-center gap-3 border-b border-background/25 pb-4 text-xs text-background/70 set-down">
      <span className="uppercase tracking-[0.1em]">Catálogo de hoy</span>
      <span aria-hidden="true" className="h-px flex-1 bg-background/25" />
      {/* `first-letter` rather than a capitalised string: es-MX returns
          "viernes", and uppercasing in JS would also hit the month. */}
      <span className="shrink-0 first-letter:uppercase">{today}</span>
    </p>
  );
}

/**
 * What is on the board right now, by category.
 *
 * Counted from the live catalogue, so the number falls as pieces sell out —
 * which is the volatility the whole design is built around, stated as a fact
 * instead of as a slogan. Categories with nothing in them are dropped rather
 * than shown at zero: an empty category is not news, it is just absent.
 *
 * A catalogue failure renders nothing. The hero is the first thing painted and
 * it must survive an API hiccup; the headline above does not depend on this.
 */
async function CatalogueTally() {
  const items = await getProducts()
    .then((page) => page.items)
    .catch(() => []);

  const available = items.filter((p) => p.availableForSale);
  if (available.length === 0) return null;

  const counts = new Map<string, number>();
  for (const product of available) {
    if (!product.category) continue;
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  const tally = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (tally.length === 0) return null;

  return (
    <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-background/25 pt-4">
      {tally.map(([category, count]) => (
        <div key={category} className="flex items-baseline gap-2">
          <dt className="text-sm text-background/70">{category}</dt>
          <dd className="text-sm tabular-nums text-background">{count}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Reserves the tally's height while it streams.
 *
 * A `null` fallback would let the block collapse and then grow, which on a
 * desktop hero means the diagonal edge visibly jumps — the one piece of
 * geometry the brand is recognised by.
 */
function TallyFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-[3.25rem] border-t border-background/25"
    />
  );
}
