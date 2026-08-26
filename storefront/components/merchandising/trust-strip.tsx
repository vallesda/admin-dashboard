import Container from '@/components/ui/container';

/**
 * What the shop stands behind.
 *
 * Typography and dividers, not four icon cards: the icon-card row is the most
 * recognisably generated pattern on the web, and it adds nothing a line of
 * type does not already say.
 *
 * Each line describes a practice, not a certification. Nothing here claims
 * anything the business has not established.
 */
const POINTS = [
  {
    title: 'Selección fresca',
    body: 'Elegimos pieza por pieza lo que entra al catálogo.',
  },
  {
    title: 'Origen transparente',
    body: 'Cada producto dice de dónde viene y cómo está cortado.',
  },
  {
    title: 'Cadena de frío',
    body: 'El producto se mantiene refrigerado desde que llega.',
  },
  {
    title: 'Entrega refrigerada',
    body: 'Sale en frío y llega en frío.',
  },
];

export default function TrustStrip() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <ul className="grid grid-cols-1 gap-px overflow-hidden border-y border-border sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((point) => (
            <li key={point.title} className="border-border py-8 sm:px-6 lg:border-l lg:first:border-l-0">
              <h3 className="font-sans text-sm font-medium uppercase tracking-[0.08em]">
                {point.title}
              </h3>
              <p className="mt-2 max-w-[30ch] text-sm text-muted">
                {point.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
