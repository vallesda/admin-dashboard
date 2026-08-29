import Container from '@/components/ui/container';
import {
  FishIcon,
  OriginIcon,
  ColdIcon,
  HandlingIcon,
} from './value-icons';
import Section from '@/components/ui/section';

/**
 * Why buy here — four practices, read in a glance.
 *
 * This replaces the old TrustStrip rather than sitting next to it: that
 * component already carried these same four claims, and two sections making
 * the same promise in different words reads as padding.
 *
 * The icon sits *beside* the title on one line rather than stacked above it.
 * Icon-over-heading-over-paragraph, repeated four times at equal size, is the
 * single most generic block on the web, and it was the silhouette this section
 * had. Inline, the four cells read as ruled columns of a ledger — which is the
 * page's own vocabulary — and the icons go back to being what the design system
 * says they are: markers the eye counts to four with, not illustrations.
 *
 * There is no section heading. The four titles are the content, a heading above
 * them would only name what they already say, and the `sr-only` h2 keeps the
 * band addressable for a screen reader without spending a line of the page on
 * it.
 *
 * Every line describes a practice, not a certification. Nothing claims anything
 * the business has not actually established — no "el mejor de México", no
 * awards, no numbers nobody has measured.
 */
const POINTS = [
  {
    Icon: FishIcon,
    title: 'Elegido pieza por pieza',
    body: 'Elegimos pieza por pieza lo que entra al catálogo. Lo que no pasa, no se vende.',
  },
  {
    Icon: OriginIcon,
    title: 'Origen transparente',
    body: 'Cada producto dice de dónde viene, cómo está cortado y en qué presentación.',
  },
  {
    Icon: ColdIcon,
    title: 'Cadena de frío',
    body: 'Refrigerado desde que llega hasta que sale. Nunca se rompe el frío.',
  },
  {
    Icon: HandlingIcon,
    title: 'Manejo especializado',
    body: 'Limpiamos, cortamos y empacamos como lo pidas, listo para cocinar.',
  },
];

export default function ValueProps() {
  return (
    <Section labelledBy="valor-heading" rhythm="sm">
      <Container>
        <h2 id="valor-heading" className="sr-only">
          Por qué comprar en Amor a Mar
        </h2>

        <ul className="grid grid-cols-1 border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ Icon, title, body }) => (
            <li
              key={title}
              className="border-b border-border py-7 sm:px-6 sm:first:pl-0 lg:border-l lg:border-b-0 lg:first:border-l-0"
            >
              <h3 className="flex items-center gap-2.5 font-sans text-sm font-medium">
                <span className="shrink-0 text-brand">
                  <Icon />
                </span>
                {title}
              </h3>
              <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
