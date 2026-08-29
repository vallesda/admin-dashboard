import { clsx } from 'clsx';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

/**
 * The trail above a record screen.
 *
 * It used to be the page's largest type — Lusitana at `text-2xl`, the same size
 * as an `<h1>` — which made the navigation trail compete with the title of the
 * thing being edited, and on the create screens the trail *was* the only title.
 * It is a `text-sm` trail now, and the screens below it carry a real
 * `PageHeader`.
 *
 * The separator is an icon marked `aria-hidden`, not a "/" character that a
 * screen reader reads aloud between every step.
 */
export default function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: Breadcrumb[];
}) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            aria-current={breadcrumb.active ? 'page' : undefined}
            className="flex items-center gap-1"
          >
            {breadcrumb.active ? (
              <span className="font-medium text-ink">{breadcrumb.label}</span>
            ) : (
              <Link
                href={breadcrumb.href}
                className="rounded text-ink-muted transition-colors hover:text-ink"
              >
                {breadcrumb.label}
              </Link>
            )}

            {index < breadcrumbs.length - 1 ? (
              <ChevronRightIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-ink-subtle"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
