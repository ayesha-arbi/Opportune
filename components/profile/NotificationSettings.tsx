"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14];

const selectClasses =
  "h-10 w-full rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-3 text-sm text-text-primary focus:border-text-primary focus:shadow-[0_0_0_3px_rgba(36,26,28,0.06)] focus:outline-none";

/**
 * Notification preferences, written directly to the user's own profile row
 * under RLS. The daily cron reads these to time deadline reminders and the
 * weekly "new matches" digest.
 */
export function NotificationSettings({
  initialDaysBefore,
  initialDigest,
}: {
  initialDaysBefore: number;
  initialDigest: "off" | "weekly";
}) {
  const [daysBefore, setDaysBefore] = useState(initialDaysBefore);
  const [digest, setDigest] = useState<"off" | "weekly">(initialDigest);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { error: updateError } = await getSupabaseBrowserClient()
        .from("profiles")
        .update({
          reminder_days_before: daysBefore,
          digest_frequency: digest,
        });
      if (updateError) throw new Error(updateError.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="reminder-days"
          className="mb-1 block text-sm text-text-tertiary"
        >
          Remind me before a deadline
        </label>
        <select
          id="reminder-days"
          value={daysBefore}
          onChange={(event) => setDaysBefore(Number(event.target.value))}
          className={selectClasses}
        >
          {DAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days} {days === 1 ? "day" : "days"} before
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="digest-frequency"
          className="mb-1 block text-sm text-text-tertiary"
        >
          Weekly &ldquo;new matches&rdquo; email
        </label>
        <select
          id="digest-frequency"
          value={digest}
          onChange={(event) =>
            setDigest(event.target.value as "off" | "weekly")
          }
          className={selectClasses}
        >
          <option value="weekly">Weekly digest</option>
          <option value="off">Off</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-9 rounded-full bg-text-primary px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved ? (
          <span className="text-sm text-success">Saved</span>
        ) : null}
        {error ? (
          <span className="text-sm text-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
