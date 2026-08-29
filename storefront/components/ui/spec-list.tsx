import Eyebrow from './eyebrow';

export type Spec = {
  label: string;
  value: React.ReactNode;
  /** Numbers a shopper compares between two cuts get tabular figures. */
  numeric?: boolean;
};

/**
 * The counter tag.
 *
 * Cut, origin, presentation and net weight are the facts a seafood shopper
 * actually decides on — they are the difference between two pieces of the same
 * fish — and they were scattered: origin joined to presentation by a middot in
 * one component, net weight whispered next to the price, category buried inside
 * a closed `<details>` at the bottom of the page. Read as prose, four facts
 * take four sentences to compare. Read as a ruled list, they take one glance.
 *
 * So they become a real definition list with a hairline under every row, which
 * is the same object a fishmonger writes on the tag beside the ice — and the
 * reason the whole system's rule vocabulary exists.
 *
 * Rows with no value are dropped by the caller, never rendered empty: a
 * "Origen —" line tells the shopper nothing and makes the shop look like it
 * lost the paperwork.
 *
 * The label column is fixed rather than `auto`, so the values start on the same
 * x-position on every product. A ragged left edge on the column a shopper is
 * scanning down defeats the point of tabulating it at all.
 */
export default function SpecList({
  specs,
  tone = 'default',
  className = '',
}: {
  specs: Spec[];
  /** `on-brand` re-tints the rules and labels for a green surface. */
  tone?: 'default' | 'on-brand';
  className?: string;
}) {
  if (specs.length === 0) return null;

  const onBrand = tone === 'on-brand';
  const rule = onBrand ? 'border-background/20' : 'border-border';

  return (
    <dl className={`border-t ${rule} ${className}`}>
      {specs.map((spec) => (
        <div
          key={spec.label}
          className={`grid grid-cols-[7.5rem_1fr] gap-x-4 border-b py-2.5 sm:grid-cols-[9rem_1fr] ${rule}`}
        >
          <Eyebrow
            as="dt"
            tone={onBrand ? 'on-brand' : 'muted'}
            // The label sits on the value's first line rather than on the row's
            // top edge: at 0.75rem against 1rem the two baselines are visibly
            // out of step otherwise.
            className="pt-1"
          >
            {spec.label}
          </Eyebrow>
          <dd
            className={`text-sm ${spec.numeric ? 'tabular-nums' : ''} ${
              onBrand ? 'text-background' : 'text-foreground'
            }`}
          >
            {spec.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
