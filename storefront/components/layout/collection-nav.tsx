import Link from 'next/link';

import { getCollections, getShelf } from '@/lib/commerce';
import Eyebrow from '@/components/ui/eyebrow';
import {
  GridIcon,
  PackageIcon,
  categoryIcon,
} from '@/components/ui/category-icons';

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
  const [collections, shelf] = await Promise.all([
    getCollections(),
    getShelf().catch(() => []),
  ]);

  // Only packages here: the categories already have their own rail above, and
  // listing a category twice would make the second group look like a duplicate
  // rather than a different question.
  const bundles = shelf.filter((item) => item.kind === 'package');

  return (
    <nav aria-label="Colecciones" className="flex flex-col gap-4">
      <Group title="Categorías">
        <Item
          href="/search"
          label="Todo el catálogo"
          icon={GridIcon}
          active={active === undefined}
        />
        {collections.map((c) => (
          <Item
            key={c.handle}
            href={`/search/${c.handle}`}
            label={c.title}
            icon={categoryIcon(c.handle, c.title)}
            active={active === c.handle}
          />
        ))}
      </Group>

      {/* Hidden entirely when the shop has not published a package. An empty
          labelled group reads as a rail that failed to load. */}
      {bundles.length > 0 ? (
        <Group title="Para qué lo quieres">
          {bundles.map((b) => (
            <Item
              key={b.handle}
              href={`/paquete/${b.handle}`}
              label={b.title}
              icon={PackageIcon}
              active={active === b.handle}
            />
          ))}
        </Group>
      ) : null}
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

/**
 * One rail chip.
 *
 * The icon is `aria-hidden` and inherits `currentColor`: the label beside it
 * already carries the meaning, and an icon that repeats its own name is noise in
 * a screen reader. Inheriting the colour is what lets one drawing work as ink at
 * rest, brand on hover and cream when the chip is filled.
 */
function Item({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: () => React.ReactElement;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors duration-150 ${
          active
            ? 'border-brand bg-brand font-medium text-background'
            : 'border-border bg-surface text-foreground hover:border-brand hover:text-brand'
        }`}
      >
        <span className="shrink-0">
          <Icon />
        </span>
        {label}
      </Link>
    </li>
  );
}
