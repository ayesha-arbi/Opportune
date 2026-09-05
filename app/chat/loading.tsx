import { SkeletonLine, SkeletonBlock, SkeletonCircle } from "@/components/common/Skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <div className="w-[260px] shrink-0 border-r border-app-border bg-surface p-4 flex-col gap-8 hidden md:flex">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-2">
          <SkeletonCircle className="h-8 w-8" />
          <SkeletonLine className="h-5 w-24" />
        </div>
        
        {/* Nav items */}
        <div className="space-y-2">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
        
        {/* Recents */}
        <div className="flex-1 space-y-4">
          <SkeletonLine className="h-4 w-16 px-2" />
          <div className="space-y-3 px-2">
            {[...Array(6)].map((_, i) => (
              <SkeletonLine key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        
        {/* Bottom profile area */}
        <div className="flex items-center gap-3 pt-4 border-t border-app-border">
          <SkeletonCircle className="h-10 w-10" />
          <div className="space-y-2 flex-1">
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-3 w-16" />
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="flex-1 overflow-hidden p-4 md:p-8 flex justify-center items-center">
          {/* Centered initial message skeleton */}
          <div className="w-full max-w-2xl space-y-8">
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
              <SkeletonCircle className="h-16 w-16" />
              <SkeletonLine className="h-8 w-48" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonBlock key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Input area skeleton */}
        <div className="p-4 md:p-8 flex justify-center border-t border-app-border bg-background">
          <div className="w-full max-w-3xl">
            <SkeletonBlock className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
