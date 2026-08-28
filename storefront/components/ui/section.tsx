/**
 * Section — vertical rhythm for a page band.
 *
 * Exists for the same reason `Heading` does: the rhythm had drifted into six
 * spellings of the same intent (`py-16 md:py-24`, `py-16 md:py-20`,
 * `py-12 md:py-16`, `py-10 md:py-16`, `py-20 md:py-28`). Sections that should
 * breathe identically were breathing differently, and nobody had decided that.
 *
 * The scale is three steps and no more. A section that needs a fourth is
 * usually a section that needs a different composition.
 */
export const RHYTHM = {
  /** Dense bands: sub-sections, order detail, secondary rows. */
  sm: 'py-12 md:py-16',
  /** The default band. Most of the homepage. */
  md: 'py-16 md:py-24',
  /** A band that should feel like a full stop — the editorial features. */
  lg: 'py-20 md:py-28',
} as const;

/** For page shells that pad a `Container` directly instead of a band. */
export type Rhythm = keyof typeof RHYTHM;

export default function Section({
  as: Tag = 'section',
  rhythm = 'md',
  labelledBy,
  id,
  children,
  className = '',
}: {
  as?: 'section' | 'div';
  rhythm?: keyof typeof RHYTHM | 'none';
  /** Sets `aria-labelledby`; pair it with a `Heading`/`Eyebrow` `id`. */
  labelledBy?: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pad = rhythm === 'none' ? '' : RHYTHM[rhythm];

  return (
    <Tag id={id} aria-labelledby={labelledBy} className={`${pad} ${className}`}>
      {children}
    </Tag>
  );
}
