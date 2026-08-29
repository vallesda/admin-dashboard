import Link from 'next/link';

import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';

/**
 * The homepage's way out to the pages that explain the shop.
 *
 * It exists because three long reads left the homepage at once — the four
 * practices, the three steps and the story — and a homepage that simply drops
 * them has no route to them at all except the header. This is that route, and
 * it is the last band before the footer on purpose: someone still scrolling
 * here has already passed the catalogue, the occasions and the week's catch, so
 * they are reading rather than buying.
 *
 * Three ruled entries rather than three cards. The system's own rule is that
 * same-size cards of heading-plus-text are the lazy container; a rule with a
 * title under it is the vocabulary this site already uses for a section head,
 * and it costs no box.
 */
const ENTRIES = [
  {
    href: '/como-funciona',
    title: 'Cómo funciona',
    body: 'Por qué el catálogo cambia cada día, cómo preparamos tu pedido y cómo llega hasta ti.',
  },
  {
    href: '/nosotros',
    title: 'Nosotros',
    body: 'Quiénes somos, qué sostenemos y por qué no publicamos lo que no podemos comprobar.',
  },
  {
    href: '/preguntas-frecuentes',
    title: 'Preguntas frecuentes',
    body: 'Catálogo, cortes especiales, entrega y pago. Lo que nos preguntan antes de pedir.',
  },
];

export default function LearnMore() {
  return (
    <Section labelledBy="saber-mas-heading">
      <Container>
        <SectionHeader
          id="saber-mas-heading"
          title={
            <>
              Antes de <em>pedir</em>
            </>
          }
          lede="Cómo trabajamos, en tres lecturas cortas."
          className="mb-10"
        />

        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {ENTRIES.map((entry) => (
            <li key={entry.href}>
              {/* The whole entry is the link, and the rule above it turns brand
                  on hover — the same affordance the product card uses, so the
                  two read as the same kind of object. */}
              <Link
                href={entry.href}
                className="group block border-t border-border pt-5 transition-colors hover:border-brand"
              >
                <h3 className="font-display text-xl font-light transition-colors group-hover:text-brand md:text-2xl">
                  {entry.title}
                </h3>
                <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-muted">
                  {entry.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
