import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerUserClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/common/AppShell";
import { NotificationSettings } from "@/components/profile/NotificationSettings";
import {
  educationLabel,
  goalTypeLabel,
} from "@/lib/constants";
import type { TrackerStatus } from "@/types/database";

export const dynamic = "force-dynamic";

function Tile({
  className = "",
  label,
  children,
}: {
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-app-border bg-surface p-5 ${className}`}
    >
      <h2 className="text-[13px] font-semibold text-text-tertiary">{label}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <p className="text-sm text-text-muted">Not set yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-tag px-3 py-1 text-xs font-medium text-[#5E4547]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className="text-right text-sm text-text-primary">
        {value ?? "—"}
      </span>
    </div>
  );
}

export default async function ProfilePage() {
  const supabase = await createServerUserClient().catch(() => null);
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
          <div className="mt-24 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-medium text-text-primary">
              {user.email?.charAt(0).toUpperCase() ?? "?"}
            </span>
            <h1 className="mt-4 font-serif text-[26px] text-text-primary">
              Your profile is empty
            </h1>
            <p className="mt-2 text-[15px] text-text-tertiary">
              Complete onboarding to get personalized recommendations.
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-block h-11 rounded-full bg-text-primary px-6 text-sm font-medium leading-[44px] text-white transition-colors duration-150 hover:bg-[#2A2A2A]"
            >
              Complete your profile
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const { data: tracked } = await supabase
    .from("user_opportunities")
    .select("status, opportunity:opportunities(deadline)")
    .eq("user_id", user.id);

  const statusCounts = (tracked ?? []).reduce(
    (counts, row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      return counts;
    },
    {} as Record<TrackerStatus, number>,
  );
  const upcoming = (tracked ?? []).filter(
    (row) =>
      row.opportunity?.deadline &&
      new Date(row.opportunity.deadline).getTime() >= Date.now(),
  ).length;
  const totalTracked = tracked?.length ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-[22px] sm:text-[26px] leading-tight text-text-primary">
              Profile
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-text-tertiary">
              This is what the assistant knows about you.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="h-10 shrink-0 rounded-full bg-text-primary px-5 text-sm font-medium leading-10 text-white transition-colors duration-150 hover:bg-[#2A2A2A]"
          >
            Edit profile
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Tile label="" className="md:col-span-2 lg:col-span-1 flex flex-col items-center text-center py-8">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-medium text-text-primary">
              {(profile.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </span>
            <p className="mt-3 font-serif text-[20px] sm:text-[22px] text-text-primary">
              {profile.full_name ?? "Unnamed explorer"}
            </p>
            <p className="mt-1 text-sm text-text-tertiary">{user.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {goalTypeLabel(profile.goal_type) ? (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-text-primary">
                  {goalTypeLabel(profile.goal_type)}
                </span>
              ) : null}
              {profile.location ? (
                <span className="rounded-full bg-tag px-3 py-1 text-xs font-medium text-[#5E4547]">
                  {profile.location}
                </span>
              ) : null}
            </div>
          </Tile>

          <Tile label="Education" className="md:col-span-2 lg:col-span-1">
            <div className="divide-y divide-[rgba(36,26,28,0.06)]">
              <FieldRow
                label="Level"
                value={educationLabel(profile.education_level)}
              />
              <FieldRow label="University" value={profile.university} />
              <FieldRow label="Field" value={profile.field_of_study} />
              <FieldRow 
                label="Remote" 
                value={profile.remote_preference ? "Prefers remote" : "Open to any location"} 
              />
            </div>
          </Tile>

          <Tile label="Interests" className="md:col-span-2 lg:col-span-1">
            <TagList tags={profile.interests ?? []} />
          </Tile>

          <Tile label="Skills" className="md:col-span-2 lg:col-span-1">
            <TagList tags={profile.skills ?? []} />
          </Tile>

          <Tile label="Tracker at a glance" className="md:col-span-2 lg:col-span-1">
            <div className="space-y-1.5">
              {(
                [
                  ["Saved", statusCounts.saved ?? 0],
                  ["Applied", statusCounts.applied ?? 0],
                  ["Submitted", statusCounts.submitted ?? 0],
                  ["Accepted", statusCounts.accepted ?? 0],
                  ["Rejected", statusCounts.rejected ?? 0],
                ] as const
              ).map(([label, count]) => (
                <div key={label} className="flex items-baseline justify-between">
                  <span className="text-sm text-text-tertiary">{label}</span>
                  <span className="text-sm font-medium tabular-nums text-text-primary">
                    {count}
                  </span>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-[rgba(36,26,28,0.06)] pt-1.5">
                <span className="text-sm text-text-tertiary">
                  Upcoming deadlines
                </span>
                <span className="text-sm font-medium tabular-nums text-text-primary">
                  {upcoming}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-tertiary">Total tracked</span>
                <span className="text-sm font-medium tabular-nums text-text-primary">
                  {totalTracked}
                </span>
              </div>
            </div>
          </Tile>

          <Tile label="Notifications" className="md:col-span-2 lg:col-span-3">
            <NotificationSettings
              initialDaysBefore={profile.reminder_days_before ?? 3}
              initialDigest={profile.digest_frequency ?? "weekly"}
            />
          </Tile>

          <Tile label="Goals" className="md:col-span-2 lg:col-span-4">
            <TagList tags={profile.goals ?? []} />
          </Tile>
        </div>
      </div>
    </AppShell>
  );
}
