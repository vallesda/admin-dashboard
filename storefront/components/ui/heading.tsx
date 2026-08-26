/**
 * Section heading.
 *
 * Exists so the editorial type scale lives in one file: a section title that is
 * `text-3xl` here and `text-4xl` two components away is how a design system
 * quietly stops being one.
 */
export default function Heading({
  as: Tag = 'h2',
  size = 'section',
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3';
  size?: 'hero' | 'section' | 'sub';
  children: React.ReactNode;
  className?: string;
}) {
  const scale = {
    hero: 'text-[3.25rem] leading-[0.95] sm:text-6xl md:text-7xl lg:text-[5.5rem]',
    section: 'text-3xl md:text-5xl',
    sub: 'text-xl md:text-2xl',
  }[size];

  return <Tag className={`${scale} ${className}`}>{children}</Tag>;
}
