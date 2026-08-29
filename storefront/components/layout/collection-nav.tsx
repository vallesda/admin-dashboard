import Link from 'next/link';

import { getCollections } from '@/lib/commerce';
import { OCCASIONS } from '@/lib/occasions';
import Eyebrow from '@/components/ui/eyebrow';

/**
 * Browsing rails for the collection pages.
 *
 * This used to be a 13rem left sidebar, and the trade it made was a bad one:
 * seven short links took a permanent seventh of the page width, which dropped
 * the product grid from four columns to three on every laptop and cost the
 * shopper a whole column of fish to display a list that fits comfortably on one
 * line. Horizontal, the rails cost two rows and the grid gets the full
 * container back.
 *
 * Taxonomy and intent stay two labelled groups, not one flat list: "Pescados"
 * and "Ceviche" answer different questions, and mixing them makes both harder
 * to scan. The group labels are the sanctioned use of `Eyebrow` — a label that
 * names a set of values, not decoration above a heading.
 *
 * The items wrap rather than scroll. A horizontally scrolling strip hides its
 * own tail on a phone, and with seven entries of two or three words there is
 * nothing here that needs hiding.
 *
 * The active entry is marked with a filled surface and `aria-current`, never
 * with colour alone.
 */
export default async function CollectionNav({
  active,
}: {
  active?: string;
}) {
  const collections = await getCollections();

  return (
    <nav aria-label="Colecciones" className="flex flex-col gap-4">
      <Group title="Categorías">
        <Item
          href="/search"
          label="Todo el catálogo"
          active={active === undefined}
        />
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

/**
 * One labelled rail.
 *
 * The label is a fixed column from `md` up so both rails' items start at the
 * same x-position — two ragged left edges directly above a grid is exactly the
 * kind of near-alignment that reads as a mistake rather than as a choice.
 */
function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-5">
      <Eyebrow as="h2" className="shrink-0 pt-2.5 md:w-[11rem]">
        {title}
      </Eyebrow>
      <ul className="flex flex-wrap gap-2">{children}</ul>
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
        className={`inline-block rounded-sm border px-3.5 py-2 text-sm transition-colors duration-150 ${
          active
            ? 'border-brand bg-brand font-medium text-background'
            : 'border-border bg-surface text-foreground hover:border-brand hover:text-brand'
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
