import type { ButtonHTMLAttributes } from 'react';

/**
 * Buttons are solid and confident, not playful: 4px radius, no pill shapes, no
 * shadow. Weight comes from colour and size, not decoration.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
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

  const look =
    variant === 'primary'
      ? 'bg-brand text-background hover:bg-brand-dark'
      : 'border border-border bg-surface text-foreground hover:bg-sand';

  return (
    <button
      className={`${base} ${look} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}
