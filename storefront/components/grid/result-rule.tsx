/**
 * The rule between the browsing rails and the grid, with the tally on its
 * right-hand end.
 *
 * Both collection pages and the search page render this, which is the point:
 * the count was previously a bare muted paragraph built inline in three
 * different async components, and the three had already drifted in margin. It
 * is also the line that closes the filters and opens the results, so it does
 * real work beyond decoration — without it the rails and the first row of
 * products sit in one undifferentiated block.
 *
 * The number is `tabular-nums` for the same reason every other figure on the
 * site is: it changes as a shopper moves between collections, and a digit that
 * shifts the word next to it draws the eye to the wrong thing.
 */
export default function ResultRule({ total }: { total: number }) {
  return (
    <div className="mb-8 flex items-baseline gap-4 border-t border-border pt-3">
      <p className="text-sm tabular-nums text-muted">
        {total} {total === 1 ? 'producto' : 'productos'}
      </p>
    </div>
  );
}
