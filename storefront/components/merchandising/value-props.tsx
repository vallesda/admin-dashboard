import Container from '@/components/ui/container';
import {
  FishIcon,
  OriginIcon,
  ColdIcon,
  HandlingIcon,
} from './value-icons';
import Eyebrow from '@/components/ui/eyebrow';
import Section from '@/components/ui/section';

/**
 * Why buy here — four reasons, read in a glance.
 *
 * This replaces the old TrustStrip rather than sitting next to it: that
 * component already carried these same four claims, and two sections making
 * the same promise in different words reads as padding.
 *
 * Small line icons, not photographs. A photo here would compete with the hero
 * and the editorial section for the same attention; the icon's whole job is to
 * be a marker the eye can count to four with.
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
    <Section labelledBy="valor-heading">
      <Container>
        <h2 id="valor-heading" className="sr-only">
          Por qué comprar en Amor a Mar
        </h2>

        <ul className="grid grid-cols-1 gap-px border-y border-border sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ Icon, title, body }) => (
            <li
              key={title}
              className="border-border py-8 sm:px-6 sm:first:pl-0 lg:border-l lg:first:border-l-0"
            >
              <span className="text-brand">
                <Icon />
              </span>
              <Eyebrow as="h3" size="sm" tone="inherit" className="mt-4">
                {title}
              </Eyebrow>
              <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
