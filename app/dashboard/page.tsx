import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerUserClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/common/AppShell";
import { DateStamp } from "@/components/common/DateStamp";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import type { Opportunity, TrackerStatus } from "@/types/database";

export const dynamic = "force-dynamic";

type TrackedRow = {
  id: string;
  status: TrackerStatus;
  opportunity: Opportunity | null;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold text-text-tertiary">{children}</h2>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-app-border bg-surface/60 px-4 py-3 text-sm text-text-tertiary">
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  // If Supabase isn't configured (or the session can't be read), fall back
  // to the login gate instead of a 500.
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
  if (!profile) redirect("/onboarding");

  const nowIso = new Date().toISOString();
  const interests = profile.interests ?? [];

  const [trackedResult, recommendedResult, recentResult] = await Promise.all([
    supabase
      .from("user_opportunities")
      .select("id, status, opportunity:opportunities(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    interests.length
      ? supabase
          .from("opportunities")
          .select("*")
          .eq("is_active", true)
          .overlaps("field_tags", interests)
          .gte("deadline", nowIso)
          .order("deadline", { ascending: true })
          .limit(4)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // Upcoming deadlines: filter the joined rows in JS (the user's own rows
  // are few) instead of using embedded-resource filters.
  const upcoming = ((trackedResult.data ?? []) as TrackedRow[])
    .flatMap((row) => {
      const deadline = row.opportunity?.deadline;
      if (!deadline || new Date(deadline).getTime() < Date.now()) return [];
      return [
        {
          id: row.id,
          status: row.status,
          opportunity: row.opportunity as Opportunity,
          deadline,
        },
      ];
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  const recommended = (recommendedResult.data ?? []) as Opportunity[];
  const recent = (recentResult.data ?? []) as Opportunity[];

  const trackedStatuses = new Map(
    ((trackedResult.data ?? []) as TrackedRow[])
      .filter((row) => row.opportunity)
      .map((row) => [row.opportunity!.id, row.status]),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-[22px] sm:text-[26px] leading-tight text-text-primary">
              Dashboard
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-text-tertiary">
              {profile.full_name ? `Hello, ${profile.full_name}.` : "Hello."}{" "}
              Here&apos;s where things stand.
            </p>
          </div>
          <Link
            href="/chat"
            className="h-10 shrink-0 rounded-full bg-text-primary px-5 text-sm font-medium leading-10 text-white transition-colors duration-150 hover:bg-[#2A2A2A]"
          >
            Open chat
          </Link>
        </div>

        <section className="mt-8">
          <SectionLabel>Upcoming deadlines</SectionLabel>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 ? (
              <EmptyNote>
                Nothing upcoming — save opportunities from the chat and they&apos;ll
                appear here with their deadlines.
              </EmptyNote>
            ) : (
              upcoming.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-app-border bg-surface px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={
                        row.opportunity.application_url ??
                        row.opportunity.source_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-serif text-[14px] sm:text-[15px] text-text-primary hover:underline"
                    >
                      {row.opportunity.title}
                    </a>
                    <p className="text-xs capitalize text-text-tertiary">
                      {row.status === "saved" ? "Saved" : row.status}
                    </p>
                  </div>
                  <DateStamp deadline={row.opportunity.deadline} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <SectionLabel>Recommended for you</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommended.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyNote>
                  {interests.length
                    ? "Nothing matches your interests right now — check back after the next data refresh."
                    : "Add interests in your profile to get recommendations."}
                </EmptyNote>
              </div>
            ) : (
              recommended.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  trackedStatus={trackedStatuses.get(opportunity.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <SectionLabel>Recently added</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {recent.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyNote>
                  No opportunities in the database yet — they&apos;ll appear once
                  seeded or scraped.
                </EmptyNote>
              </div>
            ) : (
              recent.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  trackedStatus={trackedStatuses.get(opportunity.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
