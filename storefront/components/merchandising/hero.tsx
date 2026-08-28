import Image from 'next/image';
import Link from 'next/link';

import Heading from '@/components/ui/heading';
import Button from '@/components/ui/button';

/**
 * Hero.
 *
 * Photography on one side, a brand-green block on the other, with a diagonal
 * where they meet. On mobile the geometry collapses to a stack with a small
 * angled edge — forcing the desktop diagonal into a narrow viewport turns a
 * composition into a wedge of nothing.
 *
 * The photograph is the shop's own: a boat at dawn rather than a plated dish.
 * It says where the product comes from before a single word does, which is the
 * one thing a seafood hero has to establish.
 *
 * The headline says what the shop does, not how good it is. "Pescado
 * extraordinario" was a superlative the brand's own voice rule forbids, and it
 * was doing no work the photograph wasn't already doing better.
 *
 * The CTA goes to the full catalogue rather than to an anchor further down this
 * page: an anchor scrolled the shopper PAST the first purchasable products,
 * which inverts the "buy first, story later" principle it was meant to serve.
 *
 * No data fetching here — the hero is the first thing painted, and making it
 * wait on the catalogue would delay the whole page for an image that never
 * changes.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative bg-background">
      <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr]">
        {/* Photography */}
        <div className="relative order-1 aspect-[4/3] md:order-2 md:aspect-auto md:min-h-[34rem]">
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
        <div className="order-2 bg-brand text-background edge-top md:order-1 md:edge-none">
          <div className="px-5 py-14 md:py-24 md:pl-8 md:pr-14 lg:pl-[max(2rem,calc((100vw-var(--container))/2+2rem))]">
            <Heading id="hero-heading" as="h1" size="hero" className="max-w-[13ch]">
              Del barco a tu cocina, sin escala.
            </Heading>

            <p className="mt-6 max-w-[38ch] text-lg text-background/85">
              Selección fresca, preparada para ti y entregada con cadena de
              frío.
            </p>

            <Link href="/search" className="mt-9 inline-block">
              <Button className="bg-background text-brand hover:bg-gold hover:text-foreground">
                Ver lo que hay hoy
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
