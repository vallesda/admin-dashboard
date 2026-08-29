import Link from 'next/link';

import Heading from './heading';

/**
 * The head of a band, and the piece of the counter board the whole page hangs
 * from.
 *
 * Every section of the homepage used to build this by hand, and they had drifted
 * into five spellings of the same idea: `mb-3` here and `mb-10` there, a lede at
 * `max-w-[52ch]` in three places and unbounded in a fourth, and the "see
 * everything" link present on one band and missing from the three that needed it
 * just as much. None of that variation was a decision.
 *
 * The anatomy is a fishmonger's board, and it is the same three parts every
 * time:
 *
 *   ── the rule ──────────────────────────────────────────────────
 *   Lo que hay hoy                            Ver todo el catálogo
 *   El catálogo cambia con lo que llega.
 *
 * The rule on top is what makes a band read as a section of a board rather than
 * as a card floating on cream. It also replaces the eyebrow: a small uppercase
 * label above a heading is decoration the heading does not need, and a hairline
 * does the same separating work without saying a word.
 *
 * `meta` and `action` occupy the same right-hand slot because they never both
 * apply — a band either points somewhere else (the catalogue) or counts itself
 * (a collection's product total). Taking both would put two competing endpoints
 * on one baseline.
 */
export default function SectionHeader({
  id,
  as = 'h2',
  size = 'section',
  title,
  lede,
  meta,
  action,
  tone = 'default',
  className = '',
}: {
  /** Pair with the `labelledBy` of the surrounding `Section`. */
  id?: string;
  as?: 'h1' | 'h2';
  size?: 'section' | 'sub';
  /** Wrap one noun in `<em>` for the editorial italic. */
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** A self-describing value — "7 productos". Never a link. */
  meta?: React.ReactNode;
  action?: { href: string; label: string };
  /** `on-brand` recolours the rule and the lede for a green surface. */
  tone?: 'default' | 'on-brand';
  className?: string;
}) {
  const onBrand = tone === 'on-brand';

  return (
    <div
      className={`border-t pt-5 md:pt-6 ${
        onBrand ? 'border-background/25' : 'border-border'
      } ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <Heading id={id} as={as} size={size}>
          {title}
        </Heading>

        {action ? (
          <Link
            href={action.href}
            className={`group -my-2 inline-flex shrink-0 items-center gap-1.5 py-2 text-sm transition-colors ${
              onBrand
                ? 'text-background/85 hover:text-background'
                : 'text-brand hover:text-brand-dark'
            }`}
          >
            {/* Explicit tokens rather than `border-current/40`: Tailwind's
                opacity modifier needs a channel triplet, and `currentColor`
                does not have one — the utility silently emits nothing. */}
            <span
              className={`border-b pb-0.5 transition-colors ${
                onBrand
                  ? 'border-background/40 group-hover:border-background'
                  : 'border-brand/40 group-hover:border-brand'
              }`}
            >
              {action.label}
            </span>
            {/* Nudges on hover — the only motion a text link gets, and enough
                to say the link goes somewhere rather than opens something. */}
            <span
              aria-hidden="true"
              className="transition-transform duration-200 ease-board group-hover:translate-x-0.5"
            >
              <ArrowIcon />
            </span>
          </Link>
        ) : meta ? (
          <p
            className={`shrink-0 text-sm tabular-nums ${
              onBrand ? 'text-background/70' : 'text-muted'
            }`}
          >
            {meta}
          </p>
        ) : null}
      </div>

      {lede ? (
        <p
          className={`mt-3 max-w-[52ch] ${
            onBrand ? 'text-background/85' : 'text-muted'
          }`}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
      <path
        d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
