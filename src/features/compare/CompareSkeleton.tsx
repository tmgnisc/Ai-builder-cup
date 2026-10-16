import { Skeleton } from "@/components/ui/Skeleton";

export function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading comparison table">
      {/* Breadcrumb Skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton variant="text" className="h-4 w-16" />
        <span className="text-muted/40">/</span>
        <Skeleton variant="text" className="h-4 w-24" />
      </div>

      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="text" className="mt-2 h-4 w-96 max-w-full" />
      </div>

      {/* Summary Panel Skeleton */}
      <div className="mb-6 rounded-2xl bg-surface-2/40 p-5 hairline">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="size-8" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden rounded-2xl bg-surface/50 hairline">
        {/* Table Header Row */}
        <div className="grid grid-cols-3 gap-4 border-b border-border/40 p-4 sm:grid-cols-4">
          <div className="hidden sm:block">
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton variant="rectangular" className="h-28 w-full rounded-xl" />
              <Skeleton variant="text" className="h-3 w-16" />
              <Skeleton variant="text" className="h-4 w-full" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="text" className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="bg-surface-2/60 px-4 py-2.5">
          <Skeleton variant="text" className="h-3 w-28" />
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="grid grid-cols-3 gap-4 border-t border-border/40 p-4 sm:grid-cols-4">
            <div className="hidden sm:block">
              <Skeleton variant="text" className="h-4 w-24" />
            </div>
            {[1, 2, 3].map((col) => (
              <div key={col}>
                <Skeleton variant="text" className="h-4 w-28" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
