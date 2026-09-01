import Link from 'next/link';

import { getNavCollections } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Logo from '@/components/layout/logo';
import Eyebrow from '@/components/ui/eyebrow';
import {
  INFO_LINKS,
  INSTAGRAM_URL,
  WHATSAPP_URL,
  WHATSAPP_LABEL,
} from '@/components/layout/nav-links';

/**
 * Footer.
 *
 * The deepest brand surface on the page — it is the one place the green is
 * allowed to take the whole width, which is what makes it read as an ending.
 *
 * Links point only at pages that exist or are imminent. A footer full of dead
 * links is the fastest way to make a storefront feel unfinished.
 */
/*
 * Sin `mt-24`.
 *
 * El margen superior sumaba veinticuatro de crema al relleno inferior que cada
 * sección ya trae. En las páginas que terminan en crema no se notaba —era más
 * de lo mismo—, pero desde que las estáticas cierran en un campo de color,
 * dejaba una franja clara entre el color y el pie que se leía como un hueco de
 * maquetación en vez de como aire.
 */
export default async function Footer() {
  const collections = await getNavCollections();
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-brand-dark text-background">
      {/*
        Sin banco de escamas.

        Cruzaba la parte alta del pie como textura de marca. Se retiró a
        propósito: el pie es el cierre de la página y el verde oscuro pleno ya
        hace ese trabajo solo. La textura le añadía ruido justo detrás de las
        cuatro columnas de enlaces, que es donde menos falta hacía.

        El `relative` del `<footer>` se queda —lo sigue necesitando el
        `<Container>` de abajo—, pero el `overflow-hidden` se fue con las
        escamas: estaba ahí sólo para recortarlas y ya no hay ningún hijo
        posicionado que recortar.
      */}
      <Container className="relative">
        <div className="grid grid-cols-2 gap-10 py-14 md:grid-cols-4 md:py-20">
          <div className="col-span-2 md:col-span-1">
            <Logo size={44} variant="light" />
            <p className="mt-4 max-w-[30ch] text-sm text-background/70">
              Amamos el mar y todo lo que viene de él. Producto de Baja
              California en San Pedro Garza García.
            </p>
          </div>

          <FooterColumn title="Productos">
            <FooterLink href="/search">Todo el catálogo</FooterLink>
            {collections.map((c) => (
              <FooterLink key={c.handle} href={`/search/${c.handle}`}>
                {c.title}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="La tienda">
            {INFO_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          {/*
            Real destinations, not placeholders. `https://instagram.com` used to
            sit here — the site's root, which lands a customer on a login wall
            rather than on the shop. Both entries now point at channels the
            business actually answers on, taken from its own profile.
          */}
          <FooterColumn title="Contacto">
            {/*
              El número y el usuario no se parten.

              En la columna estrecha del móvil «WhatsApp (81) 2916 2142» partía
              por el último espacio y dejaba «2142» solo en la línea siguiente,
              que es un teléfono que ya no se puede leer de un vistazo ni
              copiar de una pasada. El salto se permite después de la palabra
              —ahí no molesta— y se prohíbe dentro del dato.
            */}
            <FooterLink href={WHATSAPP_URL}>
              WhatsApp <span className="whitespace-nowrap">{WHATSAPP_LABEL}</span>
            </FooterLink>
            <FooterLink href={INSTAGRAM_URL}>
              Instagram <span className="whitespace-nowrap">@amoramarmx</span>
            </FooterLink>
            <li className="text-sm text-background/70">Entrega refrigerada</li>
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-2 border-t border-background/15 py-6 text-xs text-background/60 md:flex-row md:justify-between">
          <p>© {year} Amor a Mar</p>
          <p>Precios en pesos mexicanos (MXN)</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Eyebrow as="h3" tone="on-brand" className="mb-4">
        {title}
      </Eyebrow>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

/**
 * One footer link.
 *
 * An absolute URL leaves the site, so it renders as a plain anchor with
 * `rel="noreferrer"` rather than a `next/link` — prefetching a third-party
 * domain is wasted work, and `target="_blank"` without `noreferrer` hands the
 * opened tab a reference back to this one.
 */
function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const external = href.startsWith('http');
  const className =
    '-my-1.5 inline-block py-1.5 text-sm text-background/85 underline-offset-4 hover:underline';

  return (
    <li>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}
