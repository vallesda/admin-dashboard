import Container from '@/components/ui/container';
import { OCCASIONS } from '@/lib/occasions';
import OccasionCard from './occasion-card';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';

/**
 * Shopping by intent rather than by taxonomy.
 *
 * A shopper rarely arrives wanting "mariscos"; they arrive wanting to make
 * ceviche on Saturday. These are merchandising entry points, and each one links
 * to a collection the catalogue can back.
 *
 * Copy stays descriptive, never a claim: nothing here promises sourcing,
 * certification or delivery times the business has not established.
 *
 * The list lives in `lib/occasions.ts` because the collection page needs it
 * too: two copies of these four entries would drift the first time one is
 * renamed.
 */
export default function OccasionGrid() {
  return (
    <Section labelledBy="ocasiones-heading">
      <Container>
        <SectionHeader
          id="ocasiones-heading"
          title={
            <>
              Para qué lo <em>quieres</em>
            </>
          }
          lede="Empieza por lo que vas a preparar y nosotros te decimos qué pieza funciona mejor."
          className="mb-10"
        />

        <ul className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.handle}>
              <OccasionCard occasion={occasion} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
