import clsx from 'clsx';

/**
 * One record, as it appears below `md` where the table cannot fit.
 *
 * Each of the five list screens had written its own version of this, and they
 * had diverged in exactly the ways that make a phone layout hard to read: some
 * put the status badge next to the title and some buried it in the body, the
 * label/value pairs were sometimes a two-column grid and sometimes a run-on
 * sentence joined by middots, and only two of the five had a rule between the
 * heading and the detail.
 *
 * One shape now, and it is the shape of the desktop row: identity on the left of
 * the top line, state on the right, the facts underneath as labelled pairs, and
 * the actions last. An operator who learns the orders list can read the
 * inventory list.
 *
 * `rows` takes a nullable value and drops the pair rather than printing an empty
 * cell — a "Correo —" line is noise on a 390px screen where every line costs a
 * scroll.
 */
export type RecordRow = {
  label: string;
  value: React.ReactNode;
  /** Right-aligns and keeps figures on one line. */
  numeric?: boolean;
};

export default function RecordCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Status, on the top line where it is read first. */
  badge?: React.ReactNode;
  rows?: (RecordRow | null | false)[];
  actions?: React.ReactNode;
  className?: string;
}) {
  const visible = (rows ?? []).filter(Boolean) as RecordRow[];

  return (
    <div
      className={clsx(
        'rounded-lg border border-line bg-surface p-3.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {visible.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
          {visible.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wider text-ink-muted">
                {row.label}
              </dt>
              <dd
                className={clsx(
                  'mt-0.5 truncate text-sm text-ink',
                  row.numeric && 'tabular-nums',
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
