'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

/**
 * List search, debounced into the URL.
 *
 * The query lives in the query string rather than in component state, so a
 * filtered list is shareable, survives a reload, and can be sent to a colleague
 * — which for a shop where two people work the same order queue is the whole
 * point.
 *
 * `type="search"` and not `type="text"`: it gets the right keyboard on a phone
 * and the browser's own clear affordance, whose default paint `global.css`
 * suppresses so it does not fight the palette.
 */
export default function Search({
  placeholder,
  label = 'Buscar',
}: {
  placeholder: string;
  /** Screen-reader label. */
  label?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term) => {
    const params = new URLSearchParams(searchParams);
    // Any new search starts at page one; keeping the old page number is how a
    // search for a term with three matches lands on an empty page 4.
    params.set('page', '1');
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <div className="relative flex w-full max-w-sm">
      <label htmlFor="search" className="sr-only">
        {label}
      </label>
      <input
        id="search"
        type="search"
        className="field peer pl-9"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('query')?.toString()}
      />
      <MagnifyingGlassIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle transition-colors peer-focus:text-brand-600"
      />
    </div>
  );
}
