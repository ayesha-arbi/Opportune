"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeader } from "@/lib/supabase/client";
import { AppShell } from "@/components/common/AppShell";
import { TrackerTable, type TrackerItem } from "@/components/tracker/TrackerTable";

export default function TrackerPage() {
  const [items, setItems] = useState<TrackerItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The existing /api/tracker GET already joins opportunity details —
      // read through it rather than re-querying Supabase directly.
      const response = await fetch("/api/tracker", {
        headers: await authHeader(),
      });
      const body = (await response.json().catch(() => null)) as {
        items?: TrackerItem[];
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not load your tracker");
      }
      setItems(body?.items ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load your tracker",
      );
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell>
      <div className="px-6 py-8 lg:px-10">
        <h1 className="font-serif text-[26px] leading-tight text-text-primary">
          Tracker
        </h1>
        <p className="mt-1 text-[15px] text-text-tertiary">
          Every opportunity you&apos;ve saved, and where each application stands.
        </p>

        <div className="mt-6">
          {items === null ? (
            <p className="text-[15px] text-text-tertiary">Loading…</p>
          ) : error ? (
            <div className="rounded-2xl border border-app-border bg-surface px-4 py-3">
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-2 text-sm text-text-primary underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : (
            <TrackerTable items={items} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
