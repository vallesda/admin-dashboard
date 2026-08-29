import clsx from 'clsx';

/**
 * What a list shows when it has nothing to show.
 *
 * The panel had two kinds of empty state and both were a grey box with one grey
 * sentence in it. An empty screen is the moment an operator is most likely to
 * think the tool is broken, so it does three things instead: says plainly that
 * the list is empty, distinguishes "nothing here yet" from "nothing matched
 * your search", and offers the action that resolves it.
 *
 * `action` is deliberately optional — a filtered result has no action worth
 * offering except clearing the filter, and inventing a button for it would be
 * worse than the honest gap.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <Icon className="mb-3 h-8 w-8 text-ink-subtle" aria-hidden="true" />
      ) : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-[46ch] text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
