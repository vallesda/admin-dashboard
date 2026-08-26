/**
 * Product grid placeholder.
 *
 * Shares the grid's exact proportions so the page does not jump when the real
 * cards arrive — a skeleton with a different shape is worse than none.
 */
export default function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-sm bg-sand" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded-sm bg-sand" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded-sm bg-sand" />
        </li>
      ))}
    </ul>
  );
}
