import type { ButtonHTMLAttributes } from 'react';

/**
 * Buttons are solid and confident, not playful: 4px radius, no pill shapes, no
 * shadow. Weight comes from colour and size, not decoration.
 *
 * `onBrand` is a real variant and not a set of override classes, because the
 * override did not work. Both CTAs that live on a green surface — the hero and
 * the week's catch — were written as `variant="primary"` plus
 * `className="bg-background text-brand"`, on the assumption that a class listed
 * later in the string wins. It does not: the cascade resolves by the order the
 * utilities appear in the generated stylesheet, and `bg-background` /
 * `text-background` are both declared after their `brand` counterparts in the
 * palette. So `text-background` beat `text-brand` and both buttons rendered
 * cream text on a cream background — invisible, on the two loudest calls to
 * action the site has.
 *
 * Making it a variant means the two colours are chosen in one place and never
 * compete. Its hover is the single point in the whole system where gold touches
 * a control.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'onBrand';
  fullWidth?: boolean;
};

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...rest
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded px-6 py-3 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';

  const look = {
    primary: 'bg-brand text-background hover:bg-brand-dark',
    secondary:
      'border border-border-strong bg-surface text-foreground hover:bg-sand',
    onBrand: 'bg-background text-brand hover:bg-gold hover:text-foreground',
  }[variant];

  return (
    <button
      className={`${base} ${look} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}
