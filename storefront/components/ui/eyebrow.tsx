/**
 * Eyebrow — the small uppercase label that sits above a heading, or labels a
 * value in a definition list.
 *
 * Extracted because the same pattern had grown seven different tracking values
 * across ten files (0.08em, 0.1em, 0.12em, 0.14em, 0.16em, `tracking-wide`).
 * None of that variation was a decision; it was drift. The system's Label role
 * is one value — 0.1em — and it lives here.
 *
 * `tone` exists because this label appears on both cream and brand-green
 * surfaces, and the on-brand version must resolve from the cream token rather
 * than pure white: two whites on the same page read as a mistake.
 */
type Props = {
  as?: 'p' | 'h2' | 'h3' | 'dt' | 'span';
  /** `sm` is the card-title variant; `xs` is the default label. */
  size?: 'xs' | 'sm';
  tone?: 'muted' | 'sun' | 'on-brand' | 'inherit';
  /** For sections labelled with `aria-labelledby`. */
  id?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Eyebrow({
  as: Tag = 'p',
  size = 'xs',
  tone = 'muted',
  id,
  children,
  className = '',
}: Props) {
  const scale = size === 'sm' ? 'text-sm font-medium' : 'text-xs';

  const colour = {
    muted: 'text-muted',
    /*
   * Amarillo como tinta sólo existe sobre verde, donde mide 7.94:1. Sobre
   * crema no llega ni a 1.2:1 — de ahí que este tono no sea de uso general.
   */
  sun: 'text-sun',
    'on-brand': 'text-background/60',
    inherit: '',
  }[tone];

  return (
    <Tag
      id={id}
      className={`font-sans uppercase tracking-[0.1em] ${scale} ${colour} ${className}`}
    >
      {children}
    </Tag>
  );
}
