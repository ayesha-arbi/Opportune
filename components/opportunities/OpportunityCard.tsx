"use client";

import { useState } from "react";
import { authHeader } from "@/lib/supabase/client";
import { DateStamp } from "@/components/common/DateStamp";
import { StatusStub } from "@/components/common/StatusStub";
import type { Opportunity, TrackerStatus } from "@/types/database";

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Compact opportunity card (design system §5): serif title, one-line
 * description, the date stamp, and a single "Save" action. Once tracked,
 * the action area shows the tracker stub instead.
 */
export function OpportunityCard({
  opportunity,
  trackedStatus,
  onSaved,
}: {
  opportunity: Opportunity;
  trackedStatus?: TrackerStatus;
  onSaved?: (opportunityId: string, status: TrackerStatus) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const link = opportunity.application_url ?? opportunity.source_url;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          status: "saved",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not save this opportunity");
      }
      onSaved?.(opportunity.id, "saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-2xl border border-app-border bg-surface p-4 transition-shadow duration-150 hover:shadow-small">
      <div className="flex items-start justify-between gap-3">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif text-xl leading-tight text-text-primary hover:underline"
        >
          {opportunity.title}
        </a>
        <DateStamp deadline={opportunity.deadline} />
      </div>

      <p className="mt-1 text-[13px] text-text-tertiary">
        {formatType(opportunity.type)}
        {opportunity.organizer ? ` · ${opportunity.organizer}` : ""}
        {opportunity.is_remote
          ? " · Remote"
          : opportunity.location
            ? ` · ${opportunity.location}`
            : ""}
      </p>

      {opportunity.description ? (
        <p className="mt-2 truncate text-sm text-text-secondary">
          {opportunity.description}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        {trackedStatus ? (
          <StatusStub status={trackedStatus} />
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-9 rounded-full bg-text-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
        {error ? (
          <span className="text-xs text-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </article>
  );
}
