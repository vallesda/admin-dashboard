'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { generatePagination } from '@/lib/pagination';

/**
 * Page controls for the list screens.
 *
 * Rebuilt from the tutorial's version, which had two problems beyond looks: the
 * disabled arrows were `pointer-events-none` `<div>`s — invisible to a screen
 * reader and unreachable by keyboard, with no `aria-disabled` to explain
 * themselves — and the active page was marked with `border-blue-600`, a colour
 * that no longer exists anywhere else in the panel.
 *
 * Buttons are 32px and joined into one strip. `aria-current="page"` marks the
 * active number, so the state is announced and not just filled in.
 */
export default function Pagination({ totalPages }: { totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;
  const allPages = generatePagination(currentPage, totalPages);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-4"
    >
      <p className="text-xs text-ink-muted">
        Página <span className="font-medium text-ink">{currentPage}</span> de{' '}
        <span className="font-medium text-ink">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1">
        <Arrow
          direction="left"
          href={createPageURL(currentPage - 1)}
          isDisabled={currentPage <= 1}
        />

        <div className="hidden items-center gap-1 sm:flex">
          {allPages.map((page, index) => (
            <PageNumber
              key={`${page}-${index}`}
              href={createPageURL(page)}
              page={page}
              isActive={currentPage === page}
            />
          ))}
        </div>

        <Arrow
          direction="right"
          href={createPageURL(currentPage + 1)}
          isDisabled={currentPage >= totalPages}
        />
      </div>
    </nav>
  );
}

const CELL =
  'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors';

function PageNumber({
  page,
  href,
  isActive,
}: {
  page: number | string;
  href: string;
  isActive: boolean;
}) {
  // The ellipsis is not a destination and must not be announced as one.
  if (page === '...') {
    return (
      <span
        aria-hidden="true"
        className={clsx(CELL, 'border-transparent text-ink-subtle')}
      >
        …
      </span>
    );
  }

  if (isActive) {
    return (
      <span
        aria-current="page"
        className={clsx(CELL, 'border-brand-600 bg-brand-600 text-white')}
      >
        {page}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={clsx(
        CELL,
        'border-line-strong bg-surface text-ink hover:bg-subtle',
      )}
    >
      {page}
    </Link>
  );
}

function Arrow({
  href,
  direction,
  isDisabled,
}: {
  href: string;
  direction: 'left' | 'right';
  isDisabled?: boolean;
}) {
  const label = direction === 'left' ? 'Página anterior' : 'Página siguiente';
  const Icon = direction === 'left' ? ChevronLeftIcon : ChevronRightIcon;

  // A disabled control still announces itself and still takes focus; it just
  // says it cannot be used. The old version rendered a bare div.
  if (isDisabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        role="link"
        className={clsx(
          CELL,
          'cursor-not-allowed border-line bg-subtle text-ink-subtle',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={clsx(
        CELL,
        'border-line-strong bg-surface text-ink hover:bg-subtle',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
