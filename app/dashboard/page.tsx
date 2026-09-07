import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerUserClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/common/AppShell";
import { DateStamp } from "@/components/common/DateStamp";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import {
  embedText,
  EMBEDDING_MODEL,
  embeddingsConfigured,
  profileEmbeddingText,
} from "@/lib/ai/embeddings";
import type { Opportunity, Profile, TrackerStatus } from "@/types/database";

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

/**
 * Embed the profile for semantic recommendations, computed lazily on first
 * dashboard load and refreshed when the profile changes. Runs under the
 * user's session (RLS allows updating their own row). Returns null when
 * embeddings aren't configured — callers fall back to tag matching.
 */
async function ensureProfileEmbedding(
  supabase: Awaited<ReturnType<typeof createServerUserClient>>,
  profile: Profile,
): Promise<string | null> {
  if (!embeddingsConfigured()) return null;

  // The update trigger bumps updated_at, so allow a few seconds of clock skew
  // before treating the embedding as stale.
  const stale =
    !profile.embedding_updated_at ||
    new Date(profile.updated_at).getTime() -
      new Date(profile.embedding_updated_at).getTime() >
      5000;

  if (profile.embedding && profile.embedding_model === EMBEDDING_MODEL && !stale) {
    return profile.embedding;
  }

  try {
    const embedding = await embedText(profileEmbeddingText(profile));
    const { error } = await supabase
      .from("profiles")
      .update({
        embedding,
        embedding_model: EMBEDDING_MODEL,
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    if (error) {
      console.warn("[dashboard] could not persist profile embedding:", error.message);
    }
    return embedding;
  } catch (error) {
    console.warn("[dashboard] profile embedding failed:", error);
    return null;
  }
}

async function getSemanticRecommended(
  supabase: Awaited<ReturnType<typeof createServerUserClient>>,
  profileEmbedding: string,
  trackedIds: Set<string>,
): Promise<Opportunity[]> {
  const { data: matches, error } = await supabase.rpc("match_opportunities", {
    query_embedding: profileEmbedding,
    match_count: 8,
  });
  if (error) throw new Error(error.message);

  const nowMs = Date.now();
  const ids = (matches ?? [])
    .map((match) => match.id)
    .filter((id) => !trackedIds.has(id));
  if (ids.length === 0) return [];

  const { data, error: fetchError } = await supabase
    .from("opportunities")
    .select("*")
    .in("id", ids);
  if (fetchError) throw new Error(fetchError.message);

  const byId = new Map(((data ?? []) as Opportunity[]).map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter(
      (row): row is Opportunity =>
        Boolean(row) &&
        (!row!.deadline || new Date(row!.deadline).getTime() >= nowMs),
    )
    .slice(0, 4);
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

  const [trackedResult, recentResult] = await Promise.all([
    supabase
      .from("user_opportunities")
      .select("id, status, opportunity:opportunities(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // Upcoming deadlines: filter the joined rows in JS (the user's own rows
  // are few) instead of using embedded-resource filters.
  const trackedRows = (trackedResult.data ?? []) as TrackedRow[];
  const upcoming = trackedRows
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

  const trackedIds = new Set(
    trackedRows
      .filter((row) => row.opportunity)
      .map((row) => row.opportunity!.id),
  );

  // Recommendations: semantic ranking first, tag match as fallback. Both
  // exclude opportunities already in the tracker; the tag fallback is
  // weighted by nearest deadline (ordered by deadline ascending).
  let recommended: Opportunity[] = [];
  let recommendedBy = "";

  const profileEmbedding = await ensureProfileEmbedding(supabase, profile);
  if (profileEmbedding) {
    try {
      recommended = await getSemanticRecommended(
        supabase,
        profileEmbedding,
        trackedIds,
      );
      if (recommended.length > 0) recommendedBy = "Matched to your profile";
    } catch (error) {
      console.warn("[dashboard] semantic recommendations failed:", error);
    }
  }

  if (recommended.length === 0 && interests.length > 0) {
    let query = supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .overlaps("field_tags", interests)
      .gte("deadline", nowIso)
      .order("deadline", { ascending: true })
      .limit(12);
    if (trackedIds.size > 0) {
      query = query.not("id", "in", `(${[...trackedIds].join(",")})`);
    }
    const { data } = await query;
    recommended = ((data ?? []) as Opportunity[]).slice(0, 4);
    if (recommended.length > 0) recommendedBy = "Based on your interests";
  }

  const recent = (recentResult.data ?? []) as Opportunity[];

  const trackedStatuses = new Map(
    trackedRows
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
          <SectionLabel>
            Recommended for you
            {recommendedBy ? (
              <span className="ml-2 font-normal text-text-muted">
                · {recommendedBy}
              </span>
            ) : null}
          </SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommended.length === 0 ? (
              <div className="md:col-span-2">
                <EmptyNote>
                  {interests.length
                    ? "Nothing new matches you right now — check back after the next data refresh."
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
