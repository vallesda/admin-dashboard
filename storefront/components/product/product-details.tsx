import type { Product } from '@/lib/commerce/types';

/**
 * Below-the-fold detail.
 *
 * A Server Component with plain `<details>` rather than a JavaScript accordion:
 * native disclosure is keyboard accessible, searchable by the browser's find,
 * and open by default for search engines — three things a hand-rolled accordion
 * has to re-earn.
 *
 * The "Detalles" table that used to close this list is gone, not moved twice:
 * presentation, net weight, origin and category are now the spec list beside
 * the Add to Cart button, where a shopper deciding between two cuts can
 * actually read them. Repeating them down here would have left the same four
 * facts in two places on one page, and the copy below would go stale first.
 *
 * What remains is prose — the things that genuinely reward a second scroll.
 * Sections with no content simply do not render: an empty "Preparación"
 * heading tells the shopper nothing and makes the page look unfinished, and
 * with the table gone this component can now render nothing at all, which is
 * the honest result for a product the admin has only priced.
 */
export default function ProductDetails({ product }: { product: Product }) {
  const sections = [
    product.description
      ? { title: 'Por qué nos gusta', body: <p>{product.description}</p> }
      : null,

    product.preparationSuggestions.length > 0
      ? {
          title: 'Preparación',
          body: (
            <ul className="list-disc space-y-1 pl-5">
              {product.preparationSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ),
        }
      : null,

    product.storageInstructions
      ? { title: 'Conservación', body: <p>{product.storageInstructions}</p> }
      : null,
  ].filter(Boolean) as { title: string; body: React.ReactNode }[];

  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="detalles-heading" className="mt-20">
      <h2 id="detalles-heading" className="sr-only">
        Detalles del producto
      </h2>

      <div className="max-w-[68ch] border-t border-border">
        {sections.map((section, i) => (
          <details
            key={section.title}
            open={i === 0}
            className="group border-b border-border"
          >
            {/* `list-none` plus the empty marker kills the UA triangle in both
                WebKit and Firefox; the chevron below replaces it so the row
                still says "this opens" — and it rotates, so it also says which
                state it is in. */}
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-sans text-base font-medium marker:content-[''] hover:text-brand">
              {section.title}
              <span
                aria-hidden="true"
                className="shrink-0 text-muted transition-transform duration-200 ease-board group-open:rotate-180"
              >
                <ChevronIcon />
              </span>
            </summary>
            <div className="pb-5 leading-relaxed text-muted">
              {section.body}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
