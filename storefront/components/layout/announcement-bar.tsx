import Container from '@/components/ui/container';

/**
 * Announcement bar.
 *
 * Copy lives here as a single constant so it can be swapped without hunting
 * through markup. No carousel and no animation: a strip that moves competes
 * with the hero directly below it.
 *
 * Claims are limited to what the business actually does. Nothing about
 * certifications, guarantees or sourcing that has not been established.
 */
const ANNOUNCEMENT = 'Selección fresca · Entrega refrigerada';

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
