import clsx from 'clsx';

/**
 * One labelled form control, with its hint and its error.
 *
 * Six forms across four modules each wired label, hint, error and
 * `aria-describedby` by hand, and the wiring was inconsistent: some errors were
 * announced with `role="alert"`, some were a bare red `<p>` a screen reader
 * never reached, and the red border came from `border-red-200` — one of the
 * classes the broken Tailwind glob was dropping, so an invalid field looked
 * exactly like a valid one.
 *
 * The accessibility contract lives here now and a form author cannot forget it:
 * the control is described by its hint and its error, `aria-invalid` is set from
 * the presence of an error, and the error is announced rather than discovered by
 * tabbing back.
 *
 * `children` is a render prop rather than a wrapped `<input>` so this works for
 * `<select>`, `<textarea>`, a file picker or a radio group without growing a
 * prop for each.
 */
export default function Field({
  name,
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: {
  name: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Server-action field errors arrive as an array. */
  error?: string[] | string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    name: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    className: string;
  }) => React.ReactNode;
}) {
  const messages = error
    ? Array.isArray(error)
      ? error
      : [error]
    : [];
  const invalid = messages.length > 0;

  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = invalid ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <>
            {' '}
            {/*
              The asterisk is marked required for assistive tech through the
              control's own `required` attribute; here it is purely visual, so
              it is hidden rather than read out as "asterisk".
            */}
            <span aria-hidden="true" className="text-danger">
              *
            </span>
          </>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {children({
        id: name,
        name,
        'aria-describedby': describedBy,
        'aria-invalid': invalid || undefined,
        className: clsx('field', invalid && 'field-invalid'),
      })}

      {invalid ? (
        <div id={errorId} role="alert" className="flex flex-col gap-0.5">
          {messages.map((m) => (
            <p key={m} className="text-xs text-danger">
              {m}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
