import type { TrackerStatus } from "@/types/database";

/**
 * The ticket-stub status device: a rectangular tab with one notched corner
 * (clip-path), not a rounded pill. The only place the "application ticket"
 * metaphor becomes literal geometry.
 */
const STATUS_STYLES: Record<TrackerStatus, string> = {
  saved: "bg-surface-muted text-text-tertiary",
  applied: "bg-accent-soft text-text-primary",
  submitted: "bg-text-primary text-white",
  accepted: "bg-success-soft text-success",
  rejected: "bg-surface-muted text-text-muted opacity-70",
};

const STUB_CLIP = "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)";

const STATUS_LABELS: Record<TrackerStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  submitted: "Submitted",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function statusLabel(status: TrackerStatus): string {
  return STATUS_LABELS[status];
}

/** Static stub (display only). */
export function StatusStub({ status }: { status: TrackerStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${STATUS_STYLES[status]}`}
      style={{ clipPath: STUB_CLIP }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Interactive stub — a native select rendered as the stub for accessibility. */
export function StatusStubSelect({
  status,
  onChange,
  disabled,
}: {
  status: TrackerStatus;
  onChange: (status: TrackerStatus) => void;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-block" style={{ clipPath: STUB_CLIP }}>
      <span
        className={`pointer-events-none absolute inset-0 flex items-center justify-center px-2.5 text-xs font-medium transition-colors duration-200 ${STATUS_STYLES[status]}`}
        aria-hidden
      >
        {STATUS_LABELS[status]}
      </span>
      <select
        aria-label="Application status"
        value={status}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TrackerStatus)}
        className={`relative h-8 w-[92px] cursor-pointer appearance-none bg-transparent px-2.5 text-xs font-medium opacity-0 focus:opacity-100 ${STATUS_STYLES[status]}`}
      >
        {(Object.keys(STATUS_LABELS) as TrackerStatus[]).map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </select>
    </span>
  );
}
