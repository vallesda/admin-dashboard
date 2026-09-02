'use client';

/**
 * Un campo del checkout, con su etiqueta, su pista y su error.
 *
 * Vive aparte porque lo usan las tres zonas del formulario. Está aquí y no en
 * `components/ui` a propósito: es el campo de **este** formulario —conoce su
 * espaciado y su tono— y subirlo al kit compartido lo convertiría en una pieza
 * de sistema con un solo consumidor, que son las que se quedan sin mantener.
 */
export default function Field({
  name,
  label,
  hint,
  error,
  multiline,
  ...props
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // No `outline-none` here. It emits `outline: 2px solid transparent` from the
  // utilities layer, which beats the base-layer `:focus-visible` rule — and the
  // replacement was a border swap to brand, which the error state already
  // applies. A focused invalid field had no visible focus change at all.
  const className = `w-full rounded-sm border bg-background px-3 py-2.5 text-sm focus-visible:border-brand ${
    error ? 'border-brand' : 'border-border-strong'
  }`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>

      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}

      {multiline ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={className}
        />
      ) : (
        <input
          id={name}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={className}
          {...props}
        />
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}
