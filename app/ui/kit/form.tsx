import clsx from 'clsx';
import Link from 'next/link';

/**
 * Form furniture: the card a form sits in, its grouped sections, its footer and
 * its form-level error.
 *
 * Every form in the panel built these by hand and none of them agreed. The
 * cancel link was `bg-gray-100 text-gray-600` in four files and a plain
 * underlined link in a fifth; the submit button said "Guardando…" in three and
 * nothing in the others; the form-level error was `text-red-500` with no
 * container, no icon and no role in some, and `aria-live` in others.
 *
 * The forms also all wore the tutorial's decorated inputs — a Heroicon absolutely
 * positioned inside every field, with `pl-10` to clear it. On a product form with
 * eleven fields that is eleven icons decorating labels that already say what the
 * field is; it adds a column of noise down the left edge and buys nothing. They
 * are gone.
 */

/**
 * A labelled group of fields.
 *
 * A `<fieldset>`, so the group name is announced with each control inside it
 * rather than being a visual heading a screen reader never associates.
 */
export function FormSection({
  title,
  description,
  columns = 1,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Two columns for short paired values — price and unit, name and SKU. */
  columns?: 1 | 2;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={clsx('border-t border-line pt-5 first:border-0 first:pt-0', className)}>
      <legend className="sr-only">{title}</legend>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-[70ch] text-xs text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>

      {/*
        `items-end` on the two-column variant, so the inputs share a baseline
        even when one field carries a hint line and its neighbour does not —
        which is exactly the case for "Precio de venta" beside "Costo", where
        the two controls otherwise sat 22px apart and read as unrelated.
      */}
      <div
        className={clsx(
          'grid gap-4',
          columns === 2 ? 'sm:grid-cols-2 sm:items-end' : 'grid-cols-1',
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

/**
 * The card a form's fields live in.
 *
 * Capped at 46rem. A form stretched to a 1440px content column puts a text
 * input a metre wide next to a label, and the eye loses the connection between
 * the two — the one measurement a form layout has to get right.
 */
export function FormCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'flex max-w-3xl flex-col gap-5 rounded-lg border border-line bg-surface p-4 md:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A failure that is not attached to any one field — a unique-constraint clash,
 * a stock shortfall, an outage.
 *
 * `role="alert"` rather than a polite live region: the submit did not happen and
 * the operator needs to know before they try again. Rendered only when there is
 * something to say; an always-present empty container was announcing itself
 * inconsistently across browsers.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

/**
 * The footer.
 *
 * Cancel on the left, commit on the right, and both outside the card so the
 * card is only ever the thing being edited. The submit label is passed in and
 * the pending label is derived, so no form has to remember to disable itself.
 */
export function FormActions({
  cancelHref,
  submitLabel,
  pendingLabel = 'Guardando…',
  isPending = false,
  children,
}: {
  cancelHref: string;
  submitLabel: string;
  pendingLabel?: string;
  isPending?: boolean;
  /** Anything extra, e.g. a destructive action, rendered on the left. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex max-w-3xl flex-wrap items-center justify-end gap-3">
      {children ? <div className="mr-auto">{children}</div> : null}

      {/* `next/link`, not a bare anchor: a full document reload on Cancel
          throws away the router cache and makes leaving a form measurably
          slower than saving it. */}
      <Link
        href={cancelHref}
        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        Cancelar
      </Link>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-transparent bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-500 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}
