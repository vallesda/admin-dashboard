import Link from 'next/link';

import { getNavCollections } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Logo from '@/components/layout/logo';
import Scales from '@/components/brand/scales';
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
export default async function Footer() {
  const collections = await getNavCollections();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 overflow-hidden bg-brand-dark text-background">
      {/*
        El banco de escamas cruza el pie, que es donde el manual lo pone en sus
        aplicaciones grandes: la camiseta, el póster, la portada. Aquí cierra la
        página con el único gesto de color pleno del sitio.

        Sobre el verde oscuro y a baja opacidad: el elemento es una textura, no
        una ilustración, y compitiendo con el texto dejaría de ser ninguna de
        las dos cosas.
      */}
      <Scales
        count={72}
        amplitude={30}
        className="pointer-events-none absolute inset-x-0 top-0 h-40 w-full opacity-35"
      />

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
            <FooterLink href={WHATSAPP_URL}>
              WhatsApp {WHATSAPP_LABEL}
            </FooterLink>
            <FooterLink href={INSTAGRAM_URL}>Instagram @amoramarmx</FooterLink>
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
