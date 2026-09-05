"use client";

import { useState } from "react";
import { authHeader } from "@/lib/supabase/client";
import { DateStamp } from "@/components/common/DateStamp";
import { StatusStubSelect } from "@/components/common/StatusStub";
import type { Opportunity, TrackerStatus, UserOpportunity } from "@/types/database";

export type TrackerItem = UserOpportunity & {
  opportunity: Opportunity | null;
};

const FILTERS: { value: "all" | TrackerStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

export function TrackerTable({ items }: { items: TrackerItem[] }) {
  const [filter, setFilter] = useState<"all" | TrackerStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible =
    filter === "all" ? items : items.filter((item) => item.status === filter);

  const changeStatus = async (item: TrackerItem, status: TrackerStatus) => {
    setBusyId(item.id);
    setError(null);
    try {
      // Send only the changed field — the backend upsert updates exactly
      // what it receives, so other fields can't be clobbered.
      const response = await fetch("/api/tracker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeader()),
        },
        body: JSON.stringify({ opportunity_id: item.opportunity_id, status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not update status");
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update status",
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: TrackerItem) => {
    if (
      !window.confirm(
        `Remove "${item.opportunity?.title ?? "this opportunity"}" from your tracker?`,
      )
    ) {
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/tracker?opportunity_id=${item.opportunity_id}`,
        {
          method: "DELETE",
          headers: await authHeader(),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not remove this item");
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not remove this item",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`pb-0.5 text-sm transition-colors duration-150 ${
                active
                  ? "font-medium text-text-primary underline decoration-text-primary underline-offset-4"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-[13px] font-semibold text-text-tertiary">
              <th className="py-2 pr-4 font-semibold">Opportunity</th>
              <th className="py-2 pr-4 font-semibold">Type</th>
              <th className="py-2 pr-4 font-semibold">Deadline</th>
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => {
              const opportunity = item.opportunity;
              const expanded = expandedId === item.id;
              const hasDetail = Boolean(item.notes || item.applied_at);
              return (
                <TrackerRow
                  key={item.id}
                  item={item}
                  opportunity={opportunity}
                  expanded={expanded}
                  hasDetail={hasDetail}
                  busy={busyId === item.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === item.id ? null : item.id))
                  }
                  onStatusChange={(status) => void changeStatus(item, status)}
                  onRemove={() => void remove(item)}
                />
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <p className="py-8 text-center text-[15px] text-text-tertiary">
            {filter === "all"
              ? "Nothing tracked yet — ask the chat to find opportunities and save them."
              : `No items with status "${filter}".`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TrackerRow({
  item,
  opportunity,
  expanded,
  hasDetail,
  busy,
  onToggle,
  onStatusChange,
  onRemove,
}: {
  item: TrackerItem;
  opportunity: Opportunity | null;
  expanded: boolean;
  hasDetail: boolean;
  busy: boolean;
  onToggle: () => void;
  onStatusChange: (status: TrackerStatus) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <tr className="h-12 border-b border-app-border transition-colors duration-150 hover:bg-surface-soft">
        <td className="py-2 pr-4">
          {opportunity ? (
            <a
              href={opportunity.application_url ?? opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-[15px] leading-tight text-text-primary hover:underline"
            >
              {opportunity.title}
            </a>
          ) : (
            <span className="text-text-muted">Deleted opportunity</span>
          )}
        </td>
        <td className="py-2 pr-4 capitalize text-text-tertiary">
          {opportunity?.type ?? "—"}
        </td>
        <td className="py-2 pr-4">
          <DateStamp deadline={opportunity?.deadline ?? null} />
        </td>
        <td className="py-2 pr-4">
          <StatusStubSelect
            status={item.status}
            onChange={onStatusChange}
            disabled={busy}
          />
        </td>
        <td className="py-2">
          {hasDetail ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="text-sm text-text-tertiary underline-offset-4 hover:text-text-primary hover:underline"
            >
              {expanded ? "Hide" : "View"}
            </button>
          ) : (
            <span className="text-sm text-text-disabled">—</span>
          )}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-app-border bg-surface/60">
          <td colSpan={5} className="px-1 py-3">
            <div className="space-y-2 text-sm text-text-secondary">
              {item.applied_at ? (
                <p className="tabular-nums">
                  <span className="text-text-tertiary">Applied:</span>{" "}
                  {new Date(item.applied_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
              {item.notes ? <p>{item.notes}</p> : null}
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="text-sm text-text-muted underline-offset-4 transition-colors duration-150 hover:text-error hover:underline disabled:opacity-50"
              >
                Remove from tracker
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
