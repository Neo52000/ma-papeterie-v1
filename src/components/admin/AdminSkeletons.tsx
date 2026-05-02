// Layout-matched loading skeletons for the admin lists. Replaces the
// plain "Chargement…" text so the swap-in to real data has zero CLS
// and the empty page doesn't look broken during fetch (~300-1500ms).
//
// Pattern matches the customer-side skeletons in OrderDetail /
// AccountDashboard / WishlistList: Tailwind animate-pulse + bg-primary/10
// blocks, aria-busy + aria-label for screen readers.

interface TableSkeletonProps {
  /** Number of placeholder rows. Defaults to 6 — enough to fill the
   *  visible viewport on most admin lists without being silly. */
  rows?: number;
  /** Width hints for each column as Tailwind width classes. The first
   *  hint is repeated if the array is shorter than the actual table. */
  colWidths?: string[];
}

/** Skeleton matching the standard admin list table (date / label / status
 *  / right-aligned number). Wrap in your card border so the swap-in is
 *  visually identical. */
export function TableSkeleton({
  rows = 6,
  colWidths = ['w-20', 'w-3/4', 'w-1/3', 'w-16'],
}: TableSkeletonProps) {
  return (
    <div
      className="overflow-hidden rounded-card border border-primary/10 bg-white shadow-card"
      aria-busy="true"
      aria-label="Chargement de la liste"
    >
      <div className="border-b border-primary/10 bg-bg-soft px-4 py-3">
        <div className="flex gap-4">
          {colWidths.map((w, i) => (
            <div key={i} className={`h-3 animate-pulse rounded bg-primary/10 ${w}`} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-primary/5">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            {colWidths.map((w, j) => (
              <div key={j} className={`h-4 animate-pulse rounded bg-primary/10 ${w}`} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface KpiGridSkeletonProps {
  count?: number;
}

/** Skeleton matching the KPI grid on /admin (label + big value + hint). */
export function KpiGridSkeleton({ count = 6 }: KpiGridSkeletonProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Chargement des KPIs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <div className="h-3 w-2/3 animate-pulse rounded bg-primary/10" />
          <div className="mt-3 h-8 w-1/3 animate-pulse rounded bg-primary/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-primary/10" />
        </article>
      ))}
    </div>
  );
}

/** Skeleton for the cutover checks list — card per check with icon
 *  placeholder + label + detail. */
export function ChecksListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Chargement de la checklist">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-card border border-primary/10 bg-white p-3"
        >
          <div className="mt-0.5 h-6 w-6 flex-shrink-0 animate-pulse rounded-full bg-primary/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-primary/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-primary/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the devis detail page — left article card + right
 *  status sidebar. */
export function DevisDetailSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[1fr_280px]"
      aria-busy="true"
      aria-label="Chargement du devis"
    >
      <article className="rounded-card border border-primary/10 bg-white p-6 shadow-card">
        <div className="border-b border-primary/10 pb-4">
          <div className="h-6 w-48 animate-pulse rounded bg-primary/10" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-primary/10" />
        </div>
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <div className="h-3 w-20 animate-pulse rounded bg-primary/10" />
              <div className="col-span-2 h-3 w-3/4 animate-pulse rounded bg-primary/10" />
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-primary/10 pt-4">
          <div className="h-3 w-24 animate-pulse rounded bg-primary/10" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-primary/10" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-primary/10" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-primary/10" />
          </div>
        </div>
      </article>
      <aside className="space-y-4">
        <div className="rounded-card border border-primary/10 bg-white p-4 shadow-card">
          <div className="h-3 w-32 animate-pulse rounded bg-primary/10" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-btn bg-primary/10" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-btn bg-primary/10" />
        </div>
      </aside>
    </div>
  );
}
