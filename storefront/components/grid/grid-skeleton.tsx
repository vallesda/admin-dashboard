/**
 * Product grid placeholder.
 *
 * Shares the grid's exact proportions AND the card's exact anatomy — the 4:5
 * frame, the rule, the two baseline rows, the action — so the page does not
 * jump when the real cards arrive. A skeleton with a different shape is worse than none: it
 * promises a layout the content then contradicts.
 */
export default function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-sm bg-sand" />
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="h-4 w-3/5 animate-pulse rounded-sm bg-sand" />
              <div className="h-4 w-14 animate-pulse rounded-sm bg-sand" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <div className="h-3 w-2/5 animate-pulse rounded-sm bg-sand" />
              <div className="h-3 w-6 animate-pulse rounded-sm bg-sand" />
            </div>
          </div>

          {/* The Add button. 44px, matching the real control — without it the
              grid grew by a button's height the moment the products arrived,
              which is the jump a skeleton exists to prevent. */}
          <div className="mt-3 h-11 animate-pulse rounded bg-sand" />
        </li>
      ))}
    </ul>
  );
}
