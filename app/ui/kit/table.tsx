import clsx from 'clsx';

/**
 * Table primitives for the panel's five list screens.
 *
 * Every one of them — products, categories, customers, orders, inventory — had
 * hand-rolled its own table, and they had drifted apart in every dimension that
 * matters to someone scanning them: row height, header casing, whether numbers
 * were right-aligned, whether the thing scrolled on a phone. They also all
 * inherited the tutorial's shape, which is a grey tray (`bg-gray-50 p-2`)
 * holding a white table, with four `[&:first-child>td:first-child]:rounded-tl-lg`
 * corner hacks to fake a rounded body inside it.
 *
 * The tray is gone. A table is a surface with a border and a header on it, which
 * needs no corner hacks and one fewer grey.
 *
 * ## Density
 *
 * Rows are compact by intent: `py-2.5` on a `text-sm` cell lands a row at about
 * 41px, which fits roughly 40% more orders on a laptop screen than the
 * tutorial's `py-3` on `text-base` did. The people using this are working a
 * queue, and every row that fits is a scroll they do not make.
 *
 * ## The header sticks
 *
 * On a 60-row inventory list the column you are reading stops being identifiable
 * about four seconds in. `sticky top-0` on the header costs nothing and is the
 * single highest-value thing a dense table can do.
 */
export function TableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      {/*
        The horizontal scroller is the element that also clips the sticky
        header, so the two have to be the same box. `overflow-x-auto` was one of
        the utilities the broken Tailwind glob was dropping, which means these
        tables did not scroll on a phone at all — they just overflowed the page.
      */}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full border-collapse text-sm">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-subtle">
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

/**
 * A column heading.
 *
 * Uppercase at `text-xs` with open tracking: at this size and weight the label
 * stops competing with the data underneath it, which is the entire job of a
 * column header in a dense table. `align` mirrors the cells below so a numeric
 * column's heading sits over its own digits.
 */
export function TH({
  children,
  align = 'left',
  className,
  srOnly = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** For an actions column: the header exists for structure, not for reading. */
  srOnly?: boolean;
}) {
  return (
    <th
      scope="col"
      className={clsx(
        'whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-ink-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

/**
 * A row.
 *
 * The hover tint is not decoration — at this density it is what keeps the eye on
 * one record while the cursor tracks across seven columns. `last:border-0` so
 * the final rule does not double up with the shell's own border.
 */
export function TR({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={clsx(
        'border-b border-line transition-colors last:border-0 hover:bg-subtle/60',
        className,
      )}
    >
      {children}
    </tr>
  );
}

/**
 * A cell.
 *
 * `numeric` right-aligns it. Tabular figures are already on for every table via
 * `global.css`, so a numeric column lines up by default and a component can no
 * longer forget — the old tables applied `tabular-nums` per cell and missed
 * several.
 */
export function TD({
  children,
  align = 'left',
  numeric = false,
  muted = false,
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  numeric?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const resolved = numeric ? 'right' : align;

  return (
    <td
      className={clsx(
        'px-4 py-2.5 align-middle',
        resolved === 'right' && 'text-right',
        resolved === 'center' && 'text-center',
        muted && 'text-ink-muted',
        className,
      )}
    >
      {children}
    </td>
  );
}
