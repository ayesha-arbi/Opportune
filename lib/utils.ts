import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  OpportunityType,
  TrackerStatus,
} from "@/types/database";

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  "hackathon",
  "fellowship",
  "competition",
  "research",
  "grant",
  "other",
];

export const TRACKER_STATUSES: TrackerStatus[] = [
  "saved",
  "applied",
  "submitted",
  "accepted",
  "rejected",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isOpportunityType(value: unknown): value is OpportunityType {
  return (
    typeof value === "string" &&
    (OPPORTUNITY_TYPES as string[]).includes(value)
  );
}

export function isTrackerStatus(value: unknown): value is TrackerStatus {
  return (
    typeof value === "string" && (TRACKER_STATUSES as string[]).includes(value)
  );
}

/** Set applied_at the first time a tracker row moves to "applied" (keeps the original date on later updates). */
export async function recordAppliedAt(
  supabase: SupabaseClient<Database>,
  userId: string,
  opportunityId: string,
): Promise<void> {
  await supabase
    .from("user_opportunities")
    .update({ applied_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("opportunity_id", opportunityId)
    .is("applied_at", null);
}
