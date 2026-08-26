import Link from 'next/link';

import { getCollections } from '@/lib/commerce';
import Container from '@/components/ui/container';
import Logo from '@/components/layout/logo';

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
  const collections = await getCollections();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-brand-dark text-background">
      <Container>
        <div className="grid grid-cols-2 gap-10 py-14 md:grid-cols-4 md:py-20">
          <div className="col-span-2 md:col-span-1">
            <Logo size={44} variant="light" />
            <p className="mt-4 max-w-[28ch] text-sm text-background/70">
              Pescados y mariscos seleccionados, preparados para ti.
            </p>
          </div>

          <FooterColumn title="Productos">
            <FooterLink href="/">Todo el catálogo</FooterLink>
            {collections.map((c) => (
              <FooterLink key={c.handle} href={`/search/${c.handle}`}>
                {c.title}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Entregas">
            <li className="text-sm text-background/70">Entrega refrigerada</li>
            <li className="text-sm text-background/70">
              Consulta cobertura al hacer tu pedido
            </li>
          </FooterColumn>

          <FooterColumn title="Contacto">
            <li className="text-sm text-background/70">
              Escríbenos por Instagram
            </li>
            <FooterLink href="https://instagram.com">Instagram</FooterLink>
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
      <h3 className="mb-4 font-sans text-xs uppercase tracking-[0.12em] text-background/60">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-background/85 underline-offset-4 hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}
