import type { Product } from '@/lib/commerce/types';

/**
 * Below-the-fold detail.
 *
 * A Server Component with plain `<details>` rather than a JavaScript accordion:
 * native disclosure is keyboard accessible, searchable by the browser's find,
 * and open by default for search engines — three things a hand-rolled accordion
 * has to re-earn.
 *
 * Sections that have no content simply do not render. An empty "Preparación"
 * heading tells the shopper nothing and makes the page look unfinished.
 */
export default function ProductDetails({ product }: { product: Product }) {
  const sections = [
    product.description
      ? { title: 'Por qué nos gusta', body: <p>{product.description}</p> }
      : null,

    product.origin
      ? {
          title: 'Origen',
          body: <p>{product.origin}</p>,
        }
      : null,

    product.preparationSuggestions.length > 0
      ? {
          title: 'Preparación',
          body: (
            <ul className="list-disc pl-5">
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

    {
      title: 'Detalles',
      body: (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          {product.presentation ? (
            <>
              <dt className="text-muted">Presentación</dt>
              <dd>{product.presentation}</dd>
            </>
          ) : null}
          {product.netWeightGrams ? (
            <>
              <dt className="text-muted">Peso neto</dt>
              <dd className="tabular-nums">{product.netWeightGrams} g</dd>
            </>
          ) : null}
          {product.category ? (
            <>
              <dt className="text-muted">Categoría</dt>
              <dd>{product.category}</dd>
            </>
          ) : null}
        </dl>
      ),
    },
  ].filter(Boolean) as { title: string; body: React.ReactNode }[];

  return (
    <section className="mt-16 border-t border-border pt-10">
      <div className="max-w-[68ch]">
        {sections.map((section, i) => (
          <details
            key={section.title}
            open={i === 0}
            className="border-b border-border py-4"
          >
            <summary className="cursor-pointer list-none text-lg font-medium marker:content-['']">
              {section.title}
            </summary>
            <div className="mt-3 text-foreground [&_p]:text-muted [&_li]:text-muted">
              {section.body}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
