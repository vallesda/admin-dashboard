import type { ButtonHTMLAttributes } from 'react';

/**
 * Icon-only button.
 *
 * `label` is required, not optional: an icon button without an accessible name
 * is a button a screen reader announces as "button", and making the prop
 * mandatory is cheaper than remembering.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function IconButton({
  label,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-sm text-foreground transition-colors duration-150 hover:bg-sand ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
