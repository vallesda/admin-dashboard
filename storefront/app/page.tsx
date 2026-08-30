import { Suspense } from 'react';

import { getProducts } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import ProductGrid from '@/components/grid/product-grid';
import GridSkeleton from '@/components/grid/grid-skeleton';
import Hero from '@/components/merchandising/hero';
import BestSellers from '@/components/merchandising/best-sellers';
import ShelfGrid from '@/components/merchandising/shelf-grid';
import CatchOfTheWeek from '@/components/merchandising/catch-of-the-week';
import LearnMore from '@/components/merchandising/learn-more';

/**
 * Home — commerce first, and now it actually is.
 *
 * The old order put a merchandised row and a four-reason strip between the hero
 * and the first thing a shopper could buy, then sent the hero's own CTA to an
 * anchor that scrolled past both. Someone who arrived to buy fish met two
 * sections of persuasion first. The catalogue now sits immediately under the
 * hero, and everything that explains the shop comes after it.
 *
 * Every band below the hero is headed by `SectionHeader`, and that is the page's
 * structure rather than a tidying-up. Each of these sections used to build its
 * own header by hand, and they had drifted into five spellings of one idea —
 * different bottom margins, a lede bounded in three of them and unbounded in the
 * fourth, an exit link on one band and missing from three that needed it as
 * much. The shared hairline above each title is what now makes the page read as
 * one board with sections ruled onto it.
 *
 * The colour rhythm is deliberate: cream carries most of the page so the two
 * brand-green surfaces — the hero and the catch of the week — keep their
 * weight. About used to be a third green block directly after the second, which
 * put four diagonal cuts across two consecutive sections and pushed green well
 * past the share the design system gives it. It is cream now, and the diagonal
 * is back to being a signature instead of a pattern.
 *
 * ## What left, and where it went
 *
 * The four practices, the three steps and the story used to close this page.
 * Together they were three long reads stacked after the last purchasable thing,
 * and the homepage spent more vertical space explaining the shop than showing
 * it. They now live at `/como-funciona` and `/nosotros`, and `LearnMore` is the
 * route to them — one band of three ruled links instead of three full sections.
 *
 * Section order, and why:
 *   1. Hero        — where the fish comes from, and what is on the board today
 *   2. Catalogue   — the purchasable thing, before any argument for it
 *   3. Shelf       — categories and packages the shop curates from the panel
 *   4. Catch       — one green moment, the week's pick
 *   5. Selection   — the shop's hand-picked row, when there is one
 *   6. Learn more  — the way out to the pages that explain the shop
 */
export default function Page() {
  return (
    <>
      <Hero />

      <Section id="producto-fresco" labelledBy="catalogo-heading">
        <Container>
          <SectionHeader
            id="catalogo-heading"
            title={
              <>
                Lo que hay <em>hoy</em>
              </>
            }
            lede="El catálogo cambia con lo que llega. Todo lo disponible ahora, con su presentación y su origen."
            // The grid is capped at eight, so the way out of it has to be
            // visible. Without this the only route to the full catalogue from
            // the body of the page was a text link buried in the story section.
            action={{ href: '/search', label: 'Ver todo el catálogo' }}
            className="mb-10"
          />

          <Suspense fallback={<GridSkeleton />}>
            <Catalogue />
          </Suspense>
        </Container>
      </Section>

      <Suspense fallback={null}>
        <ShelfGrid />
      </Suspense>

      <Suspense fallback={null}>
        <CatchOfTheWeek />
      </Suspense>

      <Suspense fallback={null}>
        <BestSellers />
      </Suspense>

      <LearnMore />
    </>
  );
}

async function Catalogue() {
  const { items } = await getProducts();
  return <ProductGrid products={items.slice(0, 8)} />;
}
