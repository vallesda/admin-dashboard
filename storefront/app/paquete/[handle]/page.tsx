import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPackage } from '@/lib/commerce';
import { formatMoney, formatUnit } from '@/lib/format';
import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import Eyebrow from '@/components/ui/eyebrow';
import { RHYTHM } from '@/components/ui/section';
import AddPackage from '@/components/cart/add-package';

type Props = { params: Promise<{ handle: string }> };

/**
 * NOTE — no `loading.tsx` in this segment, for the same reason as the product
 * page: a route-level loading boundary commits a 200 before the page has
 * decided whether the package exists, turning every unknown handle into a soft
 * 404 that search engines index as a live page.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const bundle = await getPackage(handle);

  if (!bundle) return { title: 'Paquete no encontrado' };

  return {
    title: bundle.title,
    description:
      bundle.description ??
      bundle.tagline ??
      `Todo lo que necesitas para ${bundle.title.toLowerCase()}, en un solo pedido.`,
  };
}

/**
 * One package.
 *
 * The composition mirrors the product page on purpose — photograph left, the
 * decision panel right — because from the shopper's side this *is* a product
 * page for something that happens to contain several pieces. Learning one
 * teaches the other.
 *
 * The lines are a ruled list rather than a product grid. A grid invites picking
 * one, which is the opposite of what a bundle offers; a list with quantities and
 * a running total reads as a recipe's shopping list, which is what it is.
 *
 * Every line still links to its own product page. A package is a suggestion, not
 * a cage: a shopper who wants to check where the octopus came from should be one
 * click away from finding out.
 */
export default async function Page({ params }: Props) {
  const { handle } = await params;
  const bundle = await getPackage(handle);

  if (!bundle) notFound();

  return (
    <Container className={RHYTHM.sm}>
      <nav
        aria-label="Ruta de navegación"
        className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted"
      >
        <Link href="/search" className="-my-2 py-2 hover:text-brand">
          Productos
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">{bundle.title}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-sand lg:aspect-square">
          {bundle.image ? (
            <Image
              src={bundle.image.url}
              alt={bundle.image.altText}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-sm plate"
          />
        </div>

        <div className="lg:sticky lg:top-28">
          <Eyebrow className="mb-3">Paquete</Eyebrow>

          <Heading as="h1" size="section" className="max-w-[16ch]">
            {bundle.title}
          </Heading>

          {bundle.tagline ? (
            <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-muted">
              {bundle.tagline}
            </p>
          ) : null}

          {bundle.description ? (
            <p className="mt-4 max-w-[52ch] leading-relaxed text-muted">
              {bundle.description}
            </p>
          ) : null}

          {/* The shopping list. Quantities on the left of the price so the eye
              reads "how many × what" before "how much", which is the order the
              question is actually asked in. */}
          <ul className="mt-8 border-t border-border">
            {bundle.lines.map((line) => (
              <li
                key={line.product.id}
                className="flex items-baseline justify-between gap-4 border-b border-border py-3"
              >
                <span className="min-w-0">
                  <Link
                    href={`/product/${line.product.handle}`}
                    className="text-sm font-medium hover:text-brand"
                  >
                    {line.product.name}
                  </Link>
                  <span className="ml-2 text-sm tabular-nums text-muted">
                    × {line.quantity}
                  </span>
                  {line.product.presentation ? (
                    <span className="block text-xs text-muted">
                      {line.product.presentation}
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 text-sm tabular-nums">
                  {formatMoney({
                    amountCents:
                      line.product.price.amountCents * line.quantity,
                    currency: line.product.price.currency,
                  })}
                  {line.product.unit ? (
                    <span className="price-unit text-muted">
                      {' '}
                      / {formatUnit(line.product.unit)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted">Total del paquete</span>
            <span className="font-sans text-2xl tabular-nums">
              {formatMoney(bundle.total)}
            </span>
          </div>

          <div className="mt-6">
            <AddPackage bundle={bundle} />
          </div>

          {!bundle.availableForSale ? (
            /* Said plainly rather than hidden behind a disabled button with no
               explanation. The catalogue is volatile by design and a bundle can
               genuinely be short a piece today. */
            <p className="mt-3 rounded-sm bg-brand-soft px-4 py-3 text-sm">
              Hoy no tenemos existencias suficientes de todas las piezas de este
              paquete. Puedes agregarlas por separado desde el catálogo.
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Se agregan todas las piezas de una vez. Puedes ajustar cantidades
              en el carrito.
            </p>
          )}
        </div>
      </div>
    </Container>
  );
}
