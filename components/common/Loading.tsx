/**
 * Quiet page-loading state (matches the design system's loading device —
 * a blinking cursor block, no spinners or gradient skeletons).
 */
export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2.5">
      <span className="blinking-cursor inline-block h-4 w-2.5 bg-text-primary" />
      <span className="text-sm text-text-muted">{label}…</span>
    </div>
  );
}
