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
 * «Cocina» va en amarillo de marca: la promesa no es el barco ni el viaje, es
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
          El banco de escamas, a tamaño completo sobre la cuña.

          Es el segundo elemento gráfico del manual —gotas en los cinco colores
          describiendo una curva— y aquí cruza el verde entero, como en la
          camiseta y el póster del manual. El PNG venía sobre menta pálido
          (#E4F3EC) y se le recortó el alfa por distancia a ese color; sobre
          verde, un fondo opaco habría sido un recuadro.

          ## El problema, medido

          A sangre y a plena opacidad el patrón es ilegible debajo del texto:
          la gota amarilla sobre verde deja el texto crema en **2.45:1** al
          60 % y en **3.75:1** al 40 %. El mínimo es 4.5. Bajar la opacidad
          hasta que fuera seguro en todas partes —un 25 %, que mide 5.29—
          habría convertido el patrón en una mancha sin color.

          ## La solución: una máscara, no menos opacidad

          El patrón va al 55 % y una máscara vertical decide **dónde** está.
          Sobre la banda de texto la máscara lo deja al 30 %, o sea un 16 %
          efectivo: 6.6:1, con margen de sobra. De ahí abajo sube hasta el
          100 %, y en el tercio inferior —que no tiene texto— el banco se ve
          entero, con sus cinco colores separados.

          Es la misma idea que un impresor aclarando una tinta bajo un bloque
          de texto: el dibujo no se encoge, se retira de donde estorba.

          `mask-image` con `-webkit-` porque Safari todavía lo pide con
          prefijo, y sin él la máscara no se aplica: el patrón saldría al 55 %
          bajo el titular, que es exactamente el caso que esto evita.
        */}
        <Image
          src="/brand/ola.png"
          alt=""
          aria-hidden="true"
          width={1100}
          height={1340}
          sizes="(min-width: 768px) 62vw, 100vw"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover object-bottom opacity-55"
          style={{
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.30) 68%, #000 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.30) 68%, #000 100%)',
          }}
        />

        {/*
          `pr-[8vw]` on the wedge clears the 4vw slant with room to spare, so a
          long line of copy never runs into the cut edge.

          `relative z-10` lo levanta sobre el banco de escamas: sin eso el
          patrón, que es un hermano posicionado, se pintaría encima del texto.
        */}
        <div className="relative z-10 flex flex-col justify-center px-5 py-14 md:min-h-[34rem] md:py-20 md:pl-8 md:pr-[8vw] lg:min-h-[40rem] lg:pl-[max(2rem,calc((100vw-var(--container))/2+2rem))]">
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
              Del mar a tu <em className="text-sun">cocina</em>, sin escala.
            </Heading>
          </div>

          <p
            className="mt-6 max-w-[38ch] text-lg text-background/85 set-down"
            style={{ animationDelay: '180ms' }}
          >
            {/*
              El origen, que el sitio nunca decía y el manual pone en su
              primera página: «producto fresco de la mejor calidad de Baja
              California». Es la diferencia real contra un supermercado, y es
              la palabra por la que alguien busca.
            */}
            Pescados y mariscos de Baja California, seleccionados pieza por
            pieza y entregados con cadena de frío.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4 set-down"
            style={{ animationDelay: '270ms' }}
          >
            <ButtonLink href="/search" variant="onBrand">
              Ver lo que hay
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
