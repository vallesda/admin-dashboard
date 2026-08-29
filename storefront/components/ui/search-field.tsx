import { SearchIcon } from '@/components/product/icons';

/**
 * Catalogue search.
 *
 * A plain GET form, deliberately. The catalogue lives on the server, the
 * results page is a Server Component, and a `<form method="get">` gets working
 * search — including back button, bookmarkable results, and typing on a phone
 * with a `search` keyboard — without shipping a byte of client JavaScript.
 *
 * It exists because the weekly-pantry shopper had no way to narrow anything.
 * Browsing seven products is fine; browsing them every week when you already
 * know you want pulpo is not.
 */
export default function SearchField({
  defaultValue = '',
  /**
   * The header's field is narrow now that the informational links share its
   * row, and "Buscar pescado o marisco" was being clipped mid-word there. The
   * catalogue page keeps the descriptive version, where there is room for it.
   */
  placeholder = 'Buscar pescado o marisco',
  className = '',
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`relative ${className}`}
    >
      <label htmlFor="catalogue-search" className="sr-only">
        Buscar en el catálogo
      </label>

      <input
        id="catalogue-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-sm border border-border-strong bg-background py-2.5 pl-10 pr-3 text-sm placeholder:text-muted focus-visible:border-brand"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <SearchIcon />
      </span>
    </form>
  );
}
