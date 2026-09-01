'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useState } from 'react';

import IconButton from '@/components/ui/icon-button';
import type { Collection } from '@/lib/commerce/types';
import { INFO_LINKS } from '@/components/layout/nav-links';

/**
 * Mobile navigation.
 *
 * Same `<dialog>` reasoning as the cart drawer: focus trapping and Escape come
 * from the browser. Desktop navigation is not compressed into a hamburger —
 * the two are laid out separately, as the brief asks.
 */
export default function MobileMenu({
  collections,
  brand,
}: {
  collections: Collection[];
  /**
   * El logotipo, ya renderizado por el navbar.
   *
   * Llega como prop y no se importa aquí porque `Logo` lee el sistema de
   * archivos para decidir si usa la imagen del manual o su alternativa
   * tipográfica —`lib/assets` es `server-only`— y este cajón es un componente
   * de cliente: tiene estado. Importarlo rompía el build entero con «'server-only'
   * cannot be imported from a Client Component module».
   *
   * Pasarlo ya construido desde el navbar, que sí es de servidor, mantiene la
   * lectura de disco donde corresponde y deja este componente sin saber nada
   * de archivos.
   */
  brand: React.ReactNode;
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
        className="lg:hidden"
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
          {/*
            La marca, no su nombre escrito a mano.

            Aquí vivía un `<span>` con «Amor a Mar» en la tipografía de
            titulares. Funcionaba, pero era la única cabecera del sitio donde la
            marca se dibujaba con texto en lugar de con el logotipo, así que al
            abrir el cajón la identidad cambiaba justo respecto a la barra que
            lo acaba de invocar. `Logo` en su variante por defecto ya es el
            verde de marca.
          */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            {brand}
            <IconButton label="Cerrar menú" onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </div>

          {/*
            Sin buscador.

            Estaba duplicado: la barra superior ya lleva el suyo y sigue visible
            con el cajón abierto. Dos campos que buscan lo mismo en la misma
            pantalla no dan dos caminos, dan una duda — y aquí además empujaba
            las categorías hacia abajo, que es lo que el cajón existe para
            enseñar.
          */}

          {/* Ruled rows rather than a gapped list: at 18px with no separator
              the entries read as a paragraph of links, and the row a thumb is
              aiming at has no visible bounds. */}
          <nav className="flex-1 overflow-y-auto px-5 py-2">
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
                <li key={collection.handle} className="border-b border-border">
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

            {/* The shop's own pages, set smaller and muted — the same split the
                desktop header makes. A shopper is never looking for a category
                and an explainer in the same moment. */}
            <ul className="mt-2 flex flex-col">
              {INFO_LINKS.map((link) => (
                <li key={link.href} className="border-b border-border last:border-none">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block py-3.5 text-base text-muted transition-colors hover:text-brand"
                  >
                    {link.label}
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
