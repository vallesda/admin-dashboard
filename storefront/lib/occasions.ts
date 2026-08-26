/**
 * Shopping intents.
 *
 * A shopper rarely arrives wanting "mariscos"; they arrive wanting to make
 * ceviche on Saturday. These are merchandising entry points.
 *
 * NOT categories yet. The admin has no notion of an occasion, so a collection
 * page for one cannot filter by it — see `app/search/[collection]/page.tsx` for
 * how that is handled without dead-ending the shopper.
 *
 * Declared here rather than inside the homepage grid so the grid and the
 * collection page cannot drift: one list, two consumers.
 */
export type Occasion = {
  handle: string;
  title: string;
  description: string;
  image: { url: string; altText: string };
};

export const OCCASIONS: Occasion[] = [
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

export function findOccasion(handle: string): Occasion | undefined {
  return OCCASIONS.find((o) => o.handle === handle);
}
