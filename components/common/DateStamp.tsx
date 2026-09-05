import { formatStampDate, stampStyle } from "@/lib/stamp";

/**
 * The one urgency signal in the app: a stamp-like date whose ink color
 * ages from muted to red as the deadline nears, and is struck through
 * once expired. No animation — just correct when rendered.
 */
export function DateStamp({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return (
      <span className="text-xs font-medium text-text-muted">No deadline</span>
    );
  }

  const { color, expired } = stampStyle(deadline);

  return (
    <span
      className={`whitespace-nowrap text-xs font-medium tabular-nums tracking-wide ${
        expired ? "line-through opacity-55" : ""
      }`}
      style={{ color }}
      title={`Deadline ${new Date(deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`}
    >
      {formatStampDate(deadline)}
    </span>
  );
}
