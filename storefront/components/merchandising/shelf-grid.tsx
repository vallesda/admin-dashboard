import { getShelf } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';
import ShelfCard from './shelf-card';

/**
 * Shopping by intent rather than by taxonomy.
 *
 * A shopper rarely arrives wanting "mariscos"; they arrive wanting to make
 * ceviche on Saturday. This shelf is where the shop answers that, and it is
 * curated from the admin now rather than hardcoded here.
 *
 * It mixes two kinds of tile because the shop merchandises with both: a
 * **featured category**, which filters the catalogue, and a **package**, a fixed
 * bundle holding everything a dish needs. Both are filtered server-side to
 * things that actually have something to sell — a category needs an active
 * product, a package needs at least one active line — so this component never
 * has to decide whether a tile is worth rendering.
 *
 * It renders nothing when the shelf is empty. An empty "Para qué lo quieres"
 * under a 44px heading reads as a section that failed to load, and the previous
 * version could not fail that way only because its four entries were hardcoded.
 */
export default async function ShelfGrid() {
  const items = await getShelf().catch(() => []);

  if (items.length === 0) return null;

  return (
    <Section labelledBy="estante-heading">
      <Container>
        <SectionHeader
          id="estante-heading"
          title={
            <>
              Para qué lo <em>quieres</em>
            </>
          }
          lede="Empieza por lo que vas a preparar y nosotros te decimos qué pieza funciona mejor."
          className="mb-10"
        />

        <ul className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {items.map((item) => (
            <li key={`${item.kind}-${item.handle}`}>
              <ShelfCard item={item} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
