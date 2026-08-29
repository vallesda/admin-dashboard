import clsx from 'clsx';

/**
 * The head of a panel screen.
 *
 * Every list page built this by hand and no two agreed: `mb-4` here and `mt-8`
 * there, the title at `text-2xl` on one screen and `text-xl md:text-2xl` on
 * another, and the primary action sometimes beside the search box and sometimes
 * beside the heading. On a tool people move between all day, that inconsistency
 * costs a beat of re-orientation on every navigation.
 *
 * Anatomy: the title, an optional one-line description of what the screen is
 * for, and the primary action pinned right on the title's own baseline.
 *
 * There is no eyebrow and no breadcrumb here by default. In a panel with
 * permanent left navigation, a label above the heading repeats what the
 * highlighted nav item already says.
 */
export default function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** The primary action for the screen. One, ideally. */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        {/*
          `text-xl font-semibold` and not the tutorial's Lusitana serif at
          `text-2xl`. A serif display face on a screen whose content is a dense
          numeric table is a costume: it slows the heading down without making
          any of the data easier to read, and it was the only place the panel
          used a second typeface.
        */}
        <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
