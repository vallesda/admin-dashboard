import clsx from 'clsx';
import Link from 'next/link';

/**
 * The panel's buttons.
 *
 * There were three implementations and a dozen one-off `className` strings.
 * `CreateProduct` and the orders page each inlined the same 180-character
 * primary-button string; row actions were `rounded-md border p-2
 * hover:bg-gray-100` written out per component, with no focus style and — since
 * `cursor-pointer` was one of the classes the broken Tailwind glob dropped — no
 * pointer either.
 *
 * Four variants, and each answers a different question the operator is asking:
 *
 *   primary   — the one action that commits this screen. Brand green.
 *   secondary — a real action that is not the commit. Outlined.
 *   ghost     — a row-level action, quiet until you are on the row.
 *   danger    — destructive, and it has to look different from "cancel".
 *
 * Sizes are `sm` for anything inside a table row and `md` everywhere else. A
 * row action at `md` makes the row taller than its own content, which is how a
 * dense table quietly stops being dense.
 */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 border border-transparent',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-subtle active:bg-subtle',
  ghost:
    'bg-transparent text-ink-muted border border-transparent hover:bg-subtle hover:text-ink',
  danger:
    'bg-surface text-danger border border-danger/35 hover:bg-danger-soft active:bg-danger-soft',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  // Square, for an icon with only a screen-reader name. 32px is the smallest
  // this goes; it is always paired with a same-height sibling in a row.
  icon: 'h-8 w-8 justify-center',
};

function classes(variant: Variant, size: Size, className?: string) {
  return clsx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors',
    // The focus ring is the global `:focus-visible` outline, not a per-variant
    // shadow — one ring for the whole tool, and it cannot be forgotten.
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button {...rest} className={classes(variant, size, className)}>
      {children}
    </button>
  );
}

/**
 * The same thing as a link.
 *
 * Exists because half the panel's "buttons" navigate — Crear producto, Editar,
 * Ver pedido — and a `<Link>` wearing a hand-copied button string was how the
 * two drifted apart. Navigation is an anchor; it just looks like a button.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <Link {...rest} href={href} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}
