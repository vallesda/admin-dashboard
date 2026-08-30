import Image from 'next/image';
import Link from 'next/link';

import Heading from '@/components/ui/heading';
import { ButtonLink } from '@/components/ui/button';

/**
 * Hero.
 *
 * ## The composition
 *
 * The photograph is the ground now, not a neighbour. It bleeds the full width
 * of the viewport and the brand-green surface sits *on* it as a wedge, cut away
 * on its right edge by the system's own 4vw diagonal. Before, the two lived
 * side by side in a `5fr 7fr` grid: a tidy arrangement in which the image was
 * always a panel rather than a place. Letting it run edge to edge is what makes
 * the section read as somewhere the fish comes from instead of a picture of it.
 *
 * The diagonal is still the only angular transition on the screen, so the
 * signature rule holds — it simply runs vertically here, against the image,
 * rather than horizontally against cream.
 *
 * ## What was removed, and why the hero no longer fetches
 *
 * A live tally of the catalogue used to sit at the bottom of the green block —
 * "Pescados 3 · Mariscos 1" — read from the API behind its own Suspense
 * boundary. It is gone at the shop's request, and with it the last reason this
 * component touched data at all. The hero is now a pure static component: no
 * fetch, no boundary, no fallback reserving height. It is the first thing
 * painted on the site and it now depends on nothing to paint.
 *
 * The dated masthead stays. It is a line of text off the clock, not a read of
 * the catalogue, and it is the cheapest way to say that what follows is today's.
 *
 * ## Inviting the sale
 *
 * Two routes out instead of one. The primary is the catalogue — the only thing
 * a shopper who arrived to buy actually wants — and beside it a quiet text link
 * for the one who needs to know how a shop whose catalogue changes daily even
 * works. A single button forced that second person to leave through the header.
 *
 * "Cocina" carries the gold: the promise is not the boat and not the trip, it is
 * that the fish arrives in the shopper's own kitchen.
 */
export default function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      // `isolate` gives the wedge and the image a stacking context of their
      // own, so neither can interfere with the sticky header above them.
      className="relative isolate bg-brand"
    >
      {/*
        Photography — the ground. On mobile it keeps its own 4:3 block above the
        copy: a wedge of text laid over a 390px-wide photograph leaves neither
        the words nor the picture legible.
      */}
      <div className="relative aspect-[4/3] w-full md:absolute md:inset-0 md:aspect-auto md:h-full">
        <Image
          src="/editorial/hero-barco.jpg"
          alt="Barco pesquero navegando al amanecer"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/*
        The brand surface: stacked under the photo on mobile with the horizontal
        cut, a left-hand wedge over it from `md` with the vertical one.

        `relative` keeps it above the absolutely-positioned image without a
        z-index — later in the DOM is enough once both share a stacking context.
      */}
      <div className="relative bg-brand text-background edge-top md:w-[62%] md:edge-right lg:w-[56%]">
        {/*
          `pr-[8vw]` on the wedge clears the 4vw slant with room to spare, so a
          long line of copy never runs into the cut edge.
        */}
        <div className="flex flex-col justify-center px-5 py-14 md:min-h-[34rem] md:py-20 md:pl-8 md:pr-[8vw] lg:min-h-[40rem] lg:pl-[max(2rem,calc((100vw-var(--container))/2+2rem))]">
          <CatalogueDate />

          <div className="mt-8 set-down" style={{ animationDelay: '90ms' }}>
            <Heading
              id="hero-heading"
              as="h1"
              size="hero"
              // 13ch puts the break after "cocina", so the line that lands
              // alone is the one that carries the promise.
              className="max-w-[13ch]"
            >
              Del barco a tu <em className="text-gold">cocina</em>, sin escala.
            </Heading>
          </div>

          <p
            className="mt-6 max-w-[38ch] text-lg text-background/85 set-down"
            style={{ animationDelay: '180ms' }}
          >
            Selección fresca, preparada para ti y entregada con cadena de frío.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4 set-down"
            style={{ animationDelay: '270ms' }}
          >
            <ButtonLink href="/search" variant="onBrand">
              Ver lo que hay hoy
            </ButtonLink>

            {/* Quiet on purpose: findable without competing with the one button
                that leads to the thing being sold. */}
            <Link
              href="/como-funciona"
              className="-my-2 inline-block border-b border-background/40 py-2 text-sm text-background/85 transition-colors hover:border-background hover:text-background"
            >
              Cómo funciona
            </Link>
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
    <p className="flex max-w-[38ch] items-center gap-3 border-b border-background/25 pb-4 text-xs text-background/70 set-down">
      <span className="uppercase tracking-[0.1em]">Catálogo de hoy</span>
      <span aria-hidden="true" className="h-px flex-1 bg-background/25" />
      {/* `first-letter` rather than a capitalised string: es-MX returns
          "sábado", and uppercasing in JS would also hit the month. */}
      <span className="shrink-0 first-letter:uppercase">{today}</span>
    </p>
  );
}
