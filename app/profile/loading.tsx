import { AppShell } from "@/components/common/AppShell";
import { SkeletonLine, SkeletonBlock } from "@/components/common/Skeleton";

export default function ProfileLoading() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10 space-y-12">
        {/* Header area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <SkeletonLine className="h-8 w-48" />
            <SkeletonLine className="h-5 w-64" />
          </div>
          <SkeletonBlock className="h-10 w-32 shrink-0" />
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonBlock className="h-48 sm:col-span-2" />
          <SkeletonBlock className="h-48 sm:col-span-1" />
          <SkeletonBlock className="h-48 sm:col-span-2" />
          <SkeletonBlock className="h-48 sm:col-span-1" />
          <SkeletonBlock className="h-48 sm:col-span-1" />
          <SkeletonBlock className="h-48 sm:col-span-2" />
        </div>
      </div>
    </AppShell>
  );
}
