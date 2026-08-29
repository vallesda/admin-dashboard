/**
 * Loading placeholders.
 *
 * These were the tutorial's, and they were still named after its data model —
 * `InvoiceSkeleton`, `LatestInvoicesSkeleton`, `InvoicesTableSkeleton` — on a
 * panel that has never had an invoice. Worse, they were the wrong *shape*: the
 * orders and inventory screens both fell back to a placeholder drawn for a
 * five-column invoice table, so the page visibly re-laid-out when the real rows
 * arrived.
 *
 * A skeleton's only job is to reserve the space the content will take. One that
 * reserves the wrong space is worse than none, because it promises a layout and
 * then contradicts it.
 *
 * The shimmer is a moving highlight rather than a pulse, and it is the only
 * animation in the panel.
 */
const shimmer =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent';

function Bar({ className = '' }: { className?: string }) {
  return <div className={`h-3 rounded bg-subtle ${className}`} />;
}

/** One metric tile on the dashboard. Matches `MetricCards`' real geometry. */
export function StatSkeleton() {
  return (
    <div
      className={`${shimmer} rounded-lg border border-line bg-surface p-3.5`}
    >
      <Bar className="w-24" />
      <div className="mt-3 h-7 w-16 rounded bg-subtle" />
      <Bar className="mt-3 w-20" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <>
      <StatSkeleton />
      <StatSkeleton />
      <StatSkeleton />
      <StatSkeleton />
    </>
  );
}

/**
 * A dashboard side panel — recent orders, low stock.
 *
 * Five rows, because both lists cap at five; a placeholder taller than the list
 * it stands in for makes the page shrink on arrival.
 */
export function PanelListSkeleton() {
  return (
    <div
      className={`${shimmer} flex flex-col overflow-hidden rounded-lg border border-line bg-surface`}
    >
      <div className="border-b border-line px-4 py-3">
        <Bar className="w-32" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <Bar className="w-2/5" />
              <Bar className="mt-2 w-1/4" />
            </div>
            <Bar className="w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A list screen's table.
 *
 * `rows` defaults to the page size the list queries use, so the placeholder is
 * the height of a full page of results.
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className={`${shimmer} overflow-hidden rounded-lg border border-line bg-surface`}
    >
      <div className="flex items-center gap-4 border-b border-line bg-subtle px-4 py-2.5">
        <Bar className="w-28" />
        <Bar className="w-20" />
        <Bar className="ml-auto w-16" />
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0"
        >
          <div className="h-8 w-8 shrink-0 rounded bg-subtle" />
          <div className="min-w-0 flex-1">
            <Bar className="w-1/3" />
            <Bar className="mt-1.5 w-1/5" />
          </div>
          <Bar className="hidden w-20 sm:block" />
          <Bar className="w-16" />
          <div className="h-5 w-16 rounded bg-subtle" />
        </div>
      ))}
    </div>
  );
}

/** The whole dashboard, for the route-level `loading.tsx`. */
export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className={shimmer}>
        <Bar className="h-5 w-32" />
        <Bar className="mt-2 w-64" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PanelListSkeleton />
        <PanelListSkeleton />
      </div>
    </div>
  );
}
