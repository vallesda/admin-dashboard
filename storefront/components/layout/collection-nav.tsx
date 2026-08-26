import Link from 'next/link';

import { getCollections } from '@/lib/commerce';
import { OCCASIONS } from '@/lib/occasions';

/**
 * Browsing rails for the collection pages.
 *
 * Taxonomy and intent are shown as two labelled groups, not one flat list:
 * "Pescados" and "Ceviche" answer different questions, and mixing them makes
 * both harder to scan.
 *
 * The active entry is marked with weight and a rule, not colour alone.
 */
export default async function CollectionNav({
  active,
}: {
  active?: string;
}) {
  const collections = await getCollections();

  return (
    <nav aria-label="Colecciones" className="flex flex-col gap-8">
      <Group title="Categorías">
        <Item href="/search" label="Todo el catálogo" active={active === undefined} />
        {collections.map((c) => (
          <Item
            key={c.handle}
            href={`/search/${c.handle}`}
            label={c.title}
            active={active === c.handle}
          />
        ))}
      </Group>

      <Group title="Para qué lo quieres">
        {OCCASIONS.map((o) => (
          <Item
            key={o.handle}
            href={`/search/${o.handle}`}
            label={o.title}
            active={active === o.handle}
          />
        ))}
      </Group>
    </nav>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 font-sans text-xs uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 md:flex-col md:gap-y-2">
        {children}
      </ul>
    </div>
  );
}

function Item({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={
          active
            ? 'border-b-2 border-brand pb-0.5 text-sm font-medium text-brand'
            : 'text-sm text-foreground hover:text-brand'
        }
      >
        {label}
      </Link>
    </li>
  );
}
