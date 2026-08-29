import Image from 'next/image';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

import { ButtonLink } from '@/app/ui/button';

/**
 * The panel's front door.
 *
 * Not a marketing page — the storefront is the marketing surface, and the only
 * people who ever see this are staff about to sign in. It used to carry the
 * tutorial's landing composition: a 208px green banner, a serif pitch in a grey
 * box, and a decorative CSS triangle from `home.module.css`.
 *
 * What is left is what a staff landing owes its reader: whose tool this is, what
 * it does, and the way in.
 */
export const metadata = { title: 'Amor a Mar — Panel' };

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 p-6 md:flex-row md:items-center md:gap-14">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <Image
              src="/amor-amar-logo.png"
              alt=""
              width={40}
              height={40}
              priority
              className="object-contain"
            />
            <span className="text-base font-semibold tracking-tight text-ink">
              Amor a Mar
            </span>
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Panel de administración
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Catálogo, inventario y pedidos en un solo lugar. Solo para el
            personal de la pescadería.
          </p>

          <ButtonLink href="/login" className="mt-7 h-10 px-5">
            Entrar
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        <div className="min-w-0 flex-1">
          {/* One image for both breakpoints. The tutorial shipped a desktop and
              a mobile crop; this asset scales, so serving two files would only
              mean two downloads to maintain. */}
          <Image
            src="/admin-hero.png"
            width={1672}
            height={941}
            priority
            sizes="(min-width: 768px) 55vw, 100vw"
            className="h-auto w-full rounded-lg border border-line"
            alt="Panel de administración mostrando productos e inventario"
          />
        </div>
      </div>
    </main>
  );
}
