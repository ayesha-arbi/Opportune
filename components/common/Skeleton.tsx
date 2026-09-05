import React from "react";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded bg-surface-muted/50 ${className}`}
    />
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded-xl bg-surface-muted/50 ${className}`}
    />
  );
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded-full bg-surface-muted/50 ${className}`}
    />
  );
}
