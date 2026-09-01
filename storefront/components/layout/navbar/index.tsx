import Link from 'next/link';

import { getNavCollections } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Logo from '@/components/layout/logo';
import OpenCart from '@/components/cart/open-cart';
import { INFO_LINKS } from '@/components/layout/nav-links';
import MobileMenu from './mobile-menu';

/**
 * Persistent navigation.
 *
 * A Server Component: it reads the real collections from the catalogue, so the
 * menu reflects what the shop actually sells instead of a hardcoded list that
 * drifts. Only the two interactive pieces — the cart trigger and the mobile
 * drawer — are client components.
 *
 * Cream background rather than transparent-over-hero: contrast stays reliable
 * on every page, and the hero below is strong enough without borrowing the
 * header's space.
 *
 * ## Two groups, one row
 *
 * The header now carries two different kinds of link and they are not
 * interchangeable. The catalogue set — Productos plus the live categories —
 * answers "what do you sell". The informational set answers "how does this
 * work" and "who are you". They are separated by a hairline and the second set
 * is muted, so the eye can skip the half it is not looking for.
 *
 * ## Where the breakpoint sits, and why it moved
 *
 * The whole desktop row appears from `lg`, and the drawer covers everything
 * below it. It used to split at `md`: the drawer hid at 768px but the
 * informational links only appeared at 1024px, so between those two widths —
 * every small laptop and every landscape tablet — Cómo funciona, Preguntas
 * frecuentes and Nosotros were reachable from nowhere in the header at all.
 * One breakpoint for both halves makes that gap impossible to reopen.
 */
export default async function Navbar() {
  const collections = await getNavCollections();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          {/* Mobile: menu · logo · cart */}
          <div className="flex items-center gap-1 lg:hidden">
            <MobileMenu collections={collections} brand={<Logo size={36} />} />
          </div>

          <div className="flex min-w-0 items-center gap-6">
            <Logo size={36} />

            <nav aria-label="Principal" className="hidden lg:block">
              <ul className="flex items-center gap-5 text-sm">
                <li>
                  <Link
                    href="/search"
                    className="-my-2 inline-block whitespace-nowrap py-2 hover:text-brand"
                  >
                    Catálogo
                  </Link>
                </li>
                {collections.map((collection) => (
                  <li key={collection.handle}>
                    <Link
                      href={`/search/${collection.handle}`}
                      className="-my-2 inline-block whitespace-nowrap py-2 hover:text-brand"
                    >
                      {collection.title}
                    </Link>
                  </li>
                ))}

                {/* The rule is the group boundary: catalogue on its left,
                    the shop's own pages on its right. */}
                <li aria-hidden="true" className="h-4 w-px bg-border" />

                {INFO_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="-my-2 inline-block whitespace-nowrap py-2 text-muted hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/*
            The search field used to sit here. It is gone from the header: with
            the catalogue links and the shop's own pages sharing this row it had
            been squeezed to 208px and a truncated placeholder, and the
            catalogue page carries a full-width copy of it where a search
            actually starts. The drawer keeps its own for small screens.
          */}
          <div className="flex shrink-0 items-center gap-2">
            <OpenCart />
          </div>
        </div>
      </Container>
    </header>
  );
}
