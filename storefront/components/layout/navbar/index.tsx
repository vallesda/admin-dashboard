import Link from 'next/link';

import { getCollections } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Logo from '@/components/layout/logo';
import OpenCart from '@/components/cart/open-cart';
import SearchField from '@/components/ui/search-field';
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
 * "Productos" points at /search, not at `/`. It used to be a no-op on the
 * homepage, which left the full catalogue with no entry point in the header at
 * all.
 */
export default async function Navbar() {
  const collections = await getCollections();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 md:h-20">
          {/* Mobile: menu · logo · cart */}
          <div className="flex items-center gap-1 md:hidden">
            <MobileMenu collections={collections} />
          </div>

          <div className="flex items-center gap-8">
            <Logo size={36} />

            <nav aria-label="Principal" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link
                    href="/search"
                    className="-my-2 inline-block py-2 hover:text-brand"
                  >
                    Productos
                  </Link>
                </li>
                {collections.map((collection) => (
                  <li key={collection.handle}>
                    <Link
                      href={`/search/${collection.handle}`}
                      className="-my-2 inline-block py-2 hover:text-brand"
                    >
                      {collection.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Search lives in the header because the returning shopper who
                already knows what they want should not have to reach the
                catalogue page first. Hidden below `lg` only to protect the
                logo; the mobile drawer carries its own copy. */}
            <SearchField className="hidden w-56 lg:block xl:w-64" />
            <OpenCart />
          </div>
        </div>
      </Container>
    </header>
  );
}
