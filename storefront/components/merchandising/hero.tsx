import Image from 'next/image';
import Link from 'next/link';

import { getFeaturedProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
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
 * The photograph is a real product image from the catalogue rather than a stock
 * placeholder: it is the freshest seafood photography the shop actually has,
 * and it changes as the catalogue does.
 */
export default async function Hero() {
  const featured = await getFeaturedProducts(1);
  const image = featured[0]?.featuredImage ?? null;

  return (
    <section className="relative bg-background">
      <div className="grid grid-cols-1 md:grid-cols-[5fr_7fr]">
        {/* Photography */}
        <div className="relative order-1 aspect-[4/3] md:order-2 md:aspect-auto md:min-h-[34rem]">
          {image ? (
            <Image
              src={image.url}
              alt={image.altText}
              fill
              priority
              sizes="(min-width: 768px) 58vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-sand" />
          )}
        </div>

        {/* Brand surface. The diagonal lives on this block so the photograph
            keeps its full frame. */}
        <div className="order-2 bg-brand text-background edge-top md:order-1 md:edge-none">
          <div className="px-5 py-14 md:py-24 md:pl-8 md:pr-14 lg:pl-[max(2rem,calc((100vw-var(--container))/2+2rem))]">
            <Heading as="h1" size="hero" className="max-w-[13ch]">
              Pescado extraordinario, del mar a tu mesa.
            </Heading>

            <p className="mt-6 max-w-[38ch] text-lg text-background/85">
              Selección fresca, preparada para ti y entregada con cadena de
              frío.
            </p>

            <Link href="#producto-fresco" className="mt-9 inline-block">
              <Button className="bg-background text-brand hover:bg-gold hover:text-foreground">
                Comprar producto
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
