import Container from '@/components/ui/container';

/**
 * Announcement bar.
 *
 * Copy lives here as a single constant so it can be swapped without hunting
 * through markup. No carousel and no animation: a strip that moves competes
 * with the hero directly below it.
 *
 * This used to read "Selección fresca · Entrega refrigerada" — a near-verbatim
 * restatement of the hero subhead two elements below it, spending the page's
 * most valuable strip on repetition.
 *
 * It now carries the thing a first-time buyer most needs and the shop never
 * said: no card is charged. For a shop with no reviews, no press and no
 * certifications, "you pay when you have it" is the strongest reassurance
 * available — and it is simply true, so it claims nothing unestablished.
 */
const ANNOUNCEMENT = 'Pagas al recibir · Te llamamos para confirmar horario';

export default function AnnouncementBar() {
  return (
    <div className="bg-brand text-background">
      <Container>
        <p className="py-2 text-center text-xs tracking-[0.08em] md:text-sm">
          {ANNOUNCEMENT}
        </p>
      </Container>
    </div>
  );
}
