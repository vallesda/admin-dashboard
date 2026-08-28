import Image from 'next/image';
import Link from 'next/link';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Button from '@/components/ui/button';
import Price from '@/components/ui/price';
import Section from '@/components/ui/section';

/**
 * Seasonal merchandising.
 *
 * Picks a product actually flagged `seasonal` in the admin, falling back to a
 * featured one. If neither exists the section does not render — an empty
 * "Pesca de la semana" is worse than no section, and inventing a highlight the
 * shop did not choose would be worse still.
 *
 * No countdown, no "últimas piezas": the data does not support urgency, so the
 * copy does not claim it.
 */
export default async function CatchOfTheWeek() {
  const { items } = await getProducts();
  const product =
    items.find((p) => p.seasonal) ?? items.find((p) => p.featured) ?? null;

  if (!product) return null;

  return (
    <Section
      labelledBy="pesca-heading"
      rhythm="none"
      className="bg-brand text-background edge-top edge-bottom"
    >
      <Container>
        <div className="grid grid-cols-1 items-center gap-10 py-20 md:grid-cols-2 md:gap-16 md:py-28">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-brand-dark md:aspect-square">
            {product.featuredImage ? (
              <Image
                src={product.featuredImage.url}
                alt={product.featuredImage.altText}
                fill
                sizes="(min-width: 768px) 45vw, 90vw"
                className="object-cover"
              />
            ) : null}
          </div>

          <div>
            <Heading
              id="pesca-heading"
              size="section"
              className="max-w-[14ch]"
            >
              {product.name}
            </Heading>

            {product.shortDescription ? (
              <p className="mt-6 max-w-[44ch] text-lg text-background/85">
                {product.shortDescription}
              </p>
            ) : null}

            {product.origin ? (
              <p className="mt-3 text-sm text-background/70">
                Origen: {product.origin}
              </p>
            ) : null}

            <p className="mt-6 text-2xl">
              <Price value={product.price} unit={product.unit} />
            </p>

            <Link href={`/product/${product.handle}`} className="mt-8 inline-block">
              <Button className="bg-background text-brand hover:bg-gold hover:text-foreground">
                Ver producto
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
