/**
 * The one place page width and horizontal padding are decided.
 *
 * Sections that want to bleed edge to edge simply do not use it — but the
 * commerce information inside them still does, so a product grid stays aligned
 * with the navbar above it even when its background does not.
 */
export default function Container({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-container px-5 md:px-8 ${className}`}>
      {children}
    </div>
  );
}
