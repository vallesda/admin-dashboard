import Image from 'next/image';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import { ButtonLink } from '@/components/ui/button';
import Price from '@/components/ui/price';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import SpecList, { type Spec } from '@/components/ui/spec-list';

/**
 * Seasonal merchandising — the single green moment in the middle of the page.
 *
 * Picks a product actually flagged `seasonal` in the admin, falling back to a
 * featured one. If neither exists the section does not render — an empty
 * "Pesca de la semana" is worse than no section, and inventing a highlight the
 * shop did not choose would be worse still.
 *
 * The band now names itself before it names the fish. Previously the section
 * heading *was* the product name, which meant the page's largest type said
 * "Atún aleta amarilla" with no indication of why, and a shopper landing
 * mid-scroll met a product with no frame around it. The section header says
 * what this is; the product then gets the full editorial treatment beneath it.
 *
 * The spec list is the same one the product page uses, in its on-brand tone.
 * A week's pick that shows a price and no cut is a poster; showing the cut and
 * the origin is what makes it an offer.
 *
 * No countdown, no "últimas piezas": the data does not support urgency, so the
 * copy does not claim it.
 *
 * ## The gold headings
 *
 * The emphasised noun of the section title and the product's own name are set in
 * Logo Gold. This is the one band where that works: gold on the brand green
 * measures 4.20:1, which clears AA for large text, while the same gold on the
 * page's cream measures 2.06:1 and would fail anywhere else on the site. Both
 * headings are display sizes, so the 3:1 threshold is the one that applies.
 *
 * It also spends the gold budget deliberately. The system's scarcity rule caps
 * gold at two appearances per viewport, and this band now carries three at rest
 * — the two headings plus the "De temporada" chip — with the button's hover as a
 * fourth. That is a widening of the rule, recorded in DESIGN.md rather than left
 * for someone to discover as a contradiction and "fix". The band earns it: it is
 * the one section on the site whose whole subject is a piece that will not
 * always be there, which is precisely what the gold means.
 */
export default async function CatchOfTheWeek() {
  const { items } = await getProducts();
  const product =
    items.find((p) => p.seasonal) ?? items.find((p) => p.featured) ?? null;

  if (!product) return null;

  // The literal is annotated, not the filtered result: inferred, each entry
  // keeps its own narrow object shape and the type guard has nothing
  // assignable to narrow from. Rows the admin has not filled in are dropped
  // rather than rendered empty.
  const rows: (Spec | null)[] = [
    product.presentation
      ? { label: 'Presentación', value: product.presentation }
      : null,
    product.origin ? { label: 'Origen', value: product.origin } : null,
    product.netWeightGrams
      ? { label: 'Peso neto', value: `${product.netWeightGrams} g`, numeric: true }
      : null,
  ];
  const specs = rows.filter((s): s is Spec => s !== null);

  return (
    <Section
      labelledBy="pesca-heading"
      rhythm="none"
      className="bg-brand text-background edge-top edge-bottom"
    >
      <Container>
        <div className="py-20 md:py-28">
          <SectionHeader
            id="pesca-heading"
            tone="on-brand"
            title={
              <>
                La pesca de la <em className="text-gold">semana</em>
              </>
            }
            lede="Una pieza que elegimos esta semana y que no siempre vamos a tener."
            className="mb-12 md:mb-16"
          />

          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
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

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-sm plate-on-brand"
              />

              {/* One of the two gold appearances the viewport allows; the
                  other is this section's own button on hover. The chip is the
                  system's designated home for "will not always be here". */}
              {product.seasonal ? (
                <span className="absolute left-3 top-3 rounded-sm bg-gold px-2 py-1 text-xs font-medium text-foreground">
                  De temporada
                </span>
              ) : null}
            </div>

            <div>
              {/* `h3`, not `h2`: the section already owns the h2 above, and the
                  product is a level inside it. Sized as a headline anyway —
                  outline depth and type scale are separate decisions. */}
              <h3 className="max-w-[14ch] font-display text-3xl font-light leading-[1.05] md:text-[2.75rem]">
                {product.name}
              </h3>

              {product.shortDescription ? (
                <p className="mt-5 max-w-[44ch] text-lg text-background/85">
                  {product.shortDescription}
                </p>
              ) : null}

              <SpecList specs={specs} tone="on-brand" className="mt-8" />

              <p className="mt-8 font-sans text-2xl tabular-nums">
                <Price value={product.price} unit={product.unit} tone="on-brand" />
              </p>

              <ButtonLink
                href={`/product/${product.handle}`}
                variant="onBrand"
                className="mt-8"
              >
                Ver producto
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
