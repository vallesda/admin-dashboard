/**
 * Section heading.
 *
 * Exists so the editorial type scale lives in one file: a section title that is
 * `text-3xl` here and `text-4xl` two components away is how a design system
 * quietly stops being one.
 *
 * Weight moves with size, and that is the point. Newsreader at 400 is a
 * reading weight — correct at 24px, and visibly heavy at 88px, where the stems
 * thicken into a poster. The display step therefore drops to 300 and tightens
 * its tracking to compensate for the optical looseness that light weights gain
 * at scale. Every other step stays at the reading weight.
 *
 * Wrapping one noun of a title in `<em>` gives the editorial italic. It is real
 * emphasis, not a font swap: the italic is loaded in the root layout, so the
 * browser never synthesises a slant.
 */
export default function Heading({
  as: Tag = 'h2',
  size = 'section',
  id,
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3';
  size?: 'hero' | 'section' | 'sub';
  /** For sections labelled with `aria-labelledby`. */
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const scale = {
    // -0.03em, not the base layer's -0.015em: light weights need more negative
    // tracking to hold together, and this still clears the -0.04em floor.
    hero: 'text-[3.25rem] font-light leading-[0.95] tracking-[-0.03em] sm:text-6xl md:text-7xl lg:text-[5.25rem]',
    section: 'text-3xl md:text-[2.75rem] md:leading-[1.05]',
    sub: 'text-xl md:text-2xl',
  }[size];

  return (
    <Tag id={id} className={`${scale} ${className}`}>
      {children}
    </Tag>
  );
}
