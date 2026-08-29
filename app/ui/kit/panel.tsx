import clsx from 'clsx';

/**
 * A bounded region of a screen: the dashboard lists, a form section, a summary.
 *
 * One surface treatment for the whole panel — white on the canvas, a hairline
 * border, `rounded-lg` — replacing the tutorial's `rounded-xl bg-gray-50 p-2`
 * tray-holding-a-white-box, which spent two nested containers and two greys to
 * draw one edge.
 *
 * No shadow. The border and the canvas behind it already separate this from the
 * page, and a resting shadow on every region of a dense screen turns the whole
 * tool soft. `shadow-pop` exists for things that genuinely float and nothing
 * else uses it.
 */
export default function Panel({
  title,
  description,
  actions,
  footer,
  bodyClassName,
  className,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** A link or button belonging to this region, pinned to the title's right. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Set to `''` to opt out of padding — a table brings its own. */
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}

      <div className={bodyClassName ?? 'p-4'}>{children}</div>

      {footer ? (
        <footer className="mt-auto border-t border-line bg-subtle/60 px-4 py-2.5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
