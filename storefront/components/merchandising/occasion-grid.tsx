import Container from '@/components/ui/container';
import Heading from '@/components/ui/heading';
import OccasionCard, { type Occasion } from './occasion-card';

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
 * PHOTOGRAPHY: hardcoded here for now. These four will become real categories
 * with their own images managed from the admin; until then the shoot lives in
 * `public/editorial` and is versioned with the code.
 *
 * The `image` field on `Occasion` stays optional, so when the data does come
 * from a category the only change is where the URL is read from — the card
 * itself does not move.
 */
const OCCASIONS: Occasion[] = [
  {
    handle: 'sashimi',
    title: 'Sashimi',
    description: 'Cortes limpios para comer crudos',
    image: {
      url: '/editorial/sashimi.jpg',
      altText: 'Sashimi de atún y salmón servido con daikon y wasabi',
    },
  },
  {
    handle: 'ceviche',
    title: 'Ceviche',
    description: 'Pescado firme y marisco fresco',
    image: {
      url: '/editorial/ceviche.jpg',
      altText: 'Ceviche de pescado y camarón con cebolla morada y cilantro',
    },
  },
  {
    handle: 'parrilla',
    title: 'Parrilla',
    description: 'Piezas que aguantan el fuego',
    image: {
      url: '/editorial/parrilla.jpg',
      altText: 'Filete de pescado, camarones y pulpo a la parrilla con limón',
    },
  },
  {
    handle: 'cena-para-dos',
    title: 'Cena para dos',
    description: 'Porciones pensadas para dos',
    image: {
      url: '/editorial/cena-para-dos.jpg',
      altText: 'Mesa para dos con langosta, pescado, ostiones y vino blanco',
    },
  },
];

export default function OccasionGrid() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <Heading className="mb-3">Para qué lo quieres</Heading>
        <p className="mb-10 max-w-[52ch] text-muted">
          Empieza por lo que vas a preparar y nosotros te decimos qué pieza
          funciona mejor.
        </p>

        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.handle}>
              <OccasionCard occasion={occasion} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
