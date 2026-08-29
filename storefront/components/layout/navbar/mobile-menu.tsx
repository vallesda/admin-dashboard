'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useState } from 'react';

import IconButton from '@/components/ui/icon-button';
import type { Collection } from '@/lib/commerce/types';
import SearchField from '@/components/ui/search-field';

/**
 * Mobile navigation.
 *
 * Same `<dialog>` reasoning as the cart drawer: focus trapping and Escape come
 * from the browser. Desktop navigation is not compressed into a hamburger —
 * the two are laid out separately, as the brief asks.
 */
export default function MobileMenu({
  collections,
}: {
  collections: Collection[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <IconButton
        label="Abrir menú"
        onClick={() => setOpen(true)}
        className="md:hidden"
      >
        <MenuIcon />
      </IconButton>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label="Menú"
        className="drawer-left mr-auto ml-0 h-full max-h-full w-full max-w-xs bg-background p-0 text-foreground shadow-overlay backdrop:bg-foreground/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-display text-xl font-light text-brand">Amor a Mar</span>
            <IconButton label="Cerrar menú" onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </div>

          <div className="border-b border-border px-5 py-4">
            <SearchField />
          </div>

          {/* Ruled rows rather than a gapped list: at 18px with no separator
              the entries read as a paragraph of links, and the row a thumb is
              aiming at has no visible bounds. */}
          <nav className="px-5 py-2">
            <ul className="flex flex-col">
              <li className="border-b border-border">
                <Link
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="block py-4 text-lg transition-colors hover:text-brand"
                >
                  Todo el catálogo
                </Link>
              </li>
              {collections.map((collection) => (
                <li key={collection.handle} className="border-b border-border last:border-none">
                  <Link
                    href={`/search/${collection.handle}`}
                    onClick={() => setOpen(false)}
                    className="block py-4 text-lg transition-colors hover:text-brand"
                  >
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3 6h14M3 10h14M3 14h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M4 4l10 10M14 4L4 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
