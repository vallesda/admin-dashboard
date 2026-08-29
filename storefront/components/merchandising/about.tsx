import { existsSync } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import Link from 'next/link';

import Container from '@/components/ui/container';
import Section from '@/components/ui/section';
import SectionHeader from '@/components/ui/section-header';

/**
 * About — the only section on the page that is not trying to sell anything.
 *
 * It sits late, after the catalogue and the occasions, on purpose: a shopper who
 * arrived to buy fish should reach a purchasable product long before they reach
 * a story about the sea. The ones who scroll this far are the ones the story is
 * for.
 *
 * The photograph is checked before it is rendered. `next/image` throws at
 * runtime on a missing file, so pointing at one that has not been added yet
 * would take the homepage down rather than leave a tasteful gap. Without the
 * file the copy simply runs on a brand surface — which still reads as designed.
 */
const PHOTO = {
  url: '/editorial/nosotros.jpg',
  altText:
    'Pescadores descargando la captura del día al amanecer en el muelle',
};

export default function About() {
  const hasPhoto = existsSync(
    path.join(process.cwd(), 'public', PHOTO.url.replace(/^\//, '')),
  );

  return (
    <Section labelledBy="nosotros-heading" className="bg-sand/40">
      <Container>
        <div
          className={
            hasPhoto
              ? 'grid items-center gap-10 md:grid-cols-2 md:gap-16'
              : 'flex justify-center'
          }
        >
          {hasPhoto ? (
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm md:aspect-[4/5]">
              <Image
                src={PHOTO.url}
                alt={PHOTO.altText}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-sm plate"
              />
            </div>
          ) : null}

          <div className={hasPhoto ? '' : 'max-w-[62ch]'}>
            <SectionHeader
              id="nosotros-heading"
              title={
                <>
                  El mar no se <em>apura</em>
                </>
              }
              className="mb-6"
            />

            <div className="space-y-4 leading-relaxed text-muted">
              <p>
                Trabajamos con lo que el mar da ese día, no con lo que un
                catálogo dice que debería haber. Por eso lo que ves disponible
                cambia: si una pieza no llegó como la queremos, no la ponemos.
              </p>
              <p>
                Cada producto pasa por las mismas manos desde que baja del barco
                hasta que llega a tu cocina — limpio, cortado como lo pediste y
                en frío todo el camino. Es un oficio lento y no intentamos
                acelerarlo.
              </p>
            </div>

            <Link
              href="/search"
              className="mt-8 inline-block border-b border-brand/40 py-2 font-sans text-sm text-brand transition-colors hover:border-brand"
            >
              Ver lo que hay hoy
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
