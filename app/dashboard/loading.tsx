import { AppShell } from "@/components/common/AppShell";
import { SkeletonLine, SkeletonBlock } from "@/components/common/Skeleton";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10 space-y-12">
        {/* Header area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <SkeletonLine className="h-8 w-48" />
            <SkeletonLine className="h-5 w-64" />
          </div>
          <SkeletonBlock className="h-10 w-32 shrink-0" />
        </div>

        {/* Upcoming deadlines section */}
        <section className="space-y-4">
          <SkeletonLine className="h-6 w-40" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <SkeletonBlock key={i} className="h-16 w-full" />
            ))}
          </div>
        </section>

        {/* Recommended section */}
        <section className="space-y-4">
          <SkeletonLine className="h-6 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonBlock key={i} className="h-32 w-full" />
            ))}
          </div>
        </section>

        {/* Recently added section */}
        <section className="space-y-4">
          <SkeletonLine className="h-6 w-36" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonBlock key={i} className="h-32 w-full" />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
