import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_REMINDER_DAYS = 3;
const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

interface DeadlineOpportunity {
  id: string;
  title: string;
  deadline: string | null;
  source_url: string;
  application_url: string | null;
}

interface ReminderItem {
  trackerId: string;
  opportunity: DeadlineOpportunity;
}

interface UserReminderGroup {
  email: string;
  name: string | null;
  items: ReminderItem[];
}

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  reminder_days_before: number | null;
}

/**
 * Deadline reminder + weekly digest cron endpoint (Vercel Cron calls it
 * daily with GET). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET env var is set;
 * requests without it are rejected.
 */
function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[notifications] CRON_SECRET is not set — rejecting request");
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Opportune <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Resend request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(
  name: string | null,
  items: ReminderItem[],
  heading: string,
  intro: string,
): string {
  const greeting = name ? `Hi ${escapeHtml(name)}` : "Hi there";
  const rows = items
    .map(({ opportunity }) => {
      const deadline = opportunity.deadline
        ? new Date(opportunity.deadline).toUTCString()
        : "Unknown";
      const link = opportunity.application_url ?? opportunity.source_url;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#111827;">
              ${escapeHtml(opportunity.title)}
            </p>
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
              Deadline: <strong style="color:#dc2626;">${escapeHtml(deadline)}</strong>
            </p>
            <a href="${escapeHtml(link)}"
               style="font-size:14px;color:#4f46e5;text-decoration:none;font-weight:500;">
              Open opportunity &rarr;
            </a>
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h1 style="font-size:20px;color:#111827;">${escapeHtml(heading)}</h1>
      <p style="font-size:14px;color:#374151;">
        ${greeting}, ${intro}
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
        You're receiving this because you track these opportunities on Opportune.
        Manage reminder timing in your profile.
      </p>
    </div>`;
}

function noReminders(digest: Record<string, unknown>) {
  return NextResponse.json({
    matchedTrackerRows: 0,
    usersEmailed: 0,
    failed: 0,
    digestsSent: 0,
    ...digest,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date();

  // ============ Pass 1: deadline reminders (per-user windows) ============

  // 1. Tracker rows that still need a reminder.
  const { data: trackerRows, error: trackerError } = await supabase
    .from("user_opportunities")
    .select("id, user_id, opportunity_id")
    .in("status", ["saved", "applied"])
    .eq("reminder_sent", false);
  if (trackerError) {
    console.error("[notifications] tracker query failed:", trackerError);
    return NextResponse.json(
      { error: `Failed to load tracked deadlines: ${trackerError.message}` },
      { status: 500 },
    );
  }
  const trackerList = trackerRows ?? [];
  if (trackerList.length === 0) return noReminders({});

  // 2. Their opportunities (future deadlines only — past ones are gone).
  const opportunityIds = [
    ...new Set(trackerList.map((row) => row.opportunity_id)),
  ];
  const { data: upcoming, error: opportunitiesError } = await supabase
    .from("opportunities")
    .select("id, title, deadline, source_url, application_url")
    .in("id", opportunityIds)
    .gte("deadline", now.toISOString());
  if (opportunitiesError) {
    console.error("[notifications] opportunities query failed:", opportunitiesError);
    return NextResponse.json(
      { error: `Failed to load upcoming deadlines: ${opportunitiesError.message}` },
      { status: 500 },
    );
  }
  const opportunityById = new Map(
    (upcoming ?? []).map((opportunity) => [opportunity.id, opportunity]),
  );

  // 3. The users' emails and per-user reminder windows.
  const userIds = [...new Set(trackerList.map((row) => row.user_id))];
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name, reminder_days_before")
    .in("id", userIds);
  if (profilesError) {
    console.error("[notifications] profiles query failed:", profilesError);
    return NextResponse.json(
      { error: `Failed to load user emails: ${profilesError.message}` },
      { status: 500 },
    );
  }
  const profileById = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile]),
  );

  // 4. Group per user, honoring each user's reminder window.
  const groups = new Map<string, UserReminderGroup>();
  let matchedRows = 0;
  for (const row of trackerList) {
    const profile = profileById.get(row.user_id);
    const opportunity = opportunityById.get(row.opportunity_id);
    if (!profile?.email) {
      console.warn(
        `[notifications] skipping tracker row ${row.id}: user ${row.user_id} has no email`,
      );
      continue;
    }
    if (!opportunity?.deadline) continue;

    const daysBefore = profile.reminder_days_before ?? DEFAULT_REMINDER_DAYS;
    const windowEnd = now.getTime() + daysBefore * 24 * 60 * 60 * 1000;
    if (new Date(opportunity.deadline).getTime() > windowEnd) continue;

    const group = groups.get(row.user_id) ?? {
      email: profile.email,
      name: profile.full_name,
      items: [],
    };
    group.items.push({ trackerId: row.id, opportunity });
    groups.set(row.user_id, group);
    matchedRows++;
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const group of groups.values()) {
    try {
      const subject =
        group.items.length === 1
          ? `Deadline reminder: ${group.items[0].opportunity.title}`
          : `${group.items.length} opportunities close soon`;
      await sendEmail(
        group.email,
        subject,
        buildEmailHtml(
          group.name,
          group.items,
          "Upcoming deadlines",
          `these opportunities on your tracker close within your reminder window:`,
        ),
      );

      const { error: updateError } = await supabase
        .from("user_opportunities")
        .update({ reminder_sent: true })
        .in(
          "id",
          group.items.map((item) => item.trackerId),
        );
      if (updateError) {
        throw new Error(
          `Failed to mark reminder as sent: ${updateError.message}`,
        );
      }
      sent++;
    } catch (sendError) {
      failed++;
      const message =
        sendError instanceof Error ? sendError.message : "Unknown email error";
      errors.push(`Reminder to ${group.email}: ${message}`);
      console.error("[notifications] reminder email failed:", message);
    }
  }

  // ============ Pass 2: weekly "new matches" digest ============

  let digestsSent = 0;
  let digestsFailed = 0;
  const digestSinceCutoff = new Date(now.getTime() - DIGEST_INTERVAL_MS);

  const { data: digestUsers, error: digestUsersError } = await supabase
    .from("profiles")
    .select("id, email, full_name, interests, last_digest_sent_at")
    .eq("digest_frequency", "weekly")
    .or(
      `last_digest_sent_at.is.null,last_digest_sent_at.lte.${digestSinceCutoff.toISOString()}`,
    );
  if (digestUsersError) {
    console.error("[notifications] digest users query failed:", digestUsersError);
    errors.push(`Weekly digest lookup failed: ${digestUsersError.message}`);
  } else {
    for (const digestUser of digestUsers ?? []) {
      const interests = digestUser.interests ?? [];
      if (!digestUser.email || interests.length === 0) continue;

      const since = digestUser.last_digest_sent_at
        ? digestUser.last_digest_sent_at
        : digestSinceCutoff.toISOString();

      try {
        const { data: newMatches } = await supabase
          .from("opportunities")
          .select("id, title, deadline, source_url, application_url")
          .eq("is_active", true)
          .overlaps("field_tags", interests)
          .gte("deadline", now.toISOString())
          .gt("created_at", since)
          .limit(10);

        const items = (newMatches ?? []).map((opportunity) => ({
          trackerId: opportunity.id,
          opportunity,
        }));

        // Always advance the cursor — otherwise a user with no new matches
        // re-queries the same window every day forever.
        const { error: cursorError } = await supabase
          .from("profiles")
          .update({ last_digest_sent_at: now.toISOString() })
          .eq("id", digestUser.id);
        if (cursorError) {
          throw new Error(`Failed to advance digest cursor: ${cursorError.message}`);
        }

        if (items.length === 0) continue;

        await sendEmail(
          digestUser.email,
          `${items.length} new opportunities match your interests`,
          buildEmailHtml(
            digestUser.full_name,
            items,
            "New opportunities for you",
            `these were added to Opportune since your last update and match your interests:`,
          ),
        );
        digestsSent++;
      } catch (digestError) {
        digestsFailed++;
        const message =
          digestError instanceof Error
            ? digestError.message
            : "Unknown digest error";
        errors.push(`Digest to ${digestUser.email}: ${message}`);
        console.error("[notifications] digest email failed:", message);
      }
    }
  }

  console.log(
    `[notifications] reminder rows matched: ${matchedRows}, reminders sent: ${sent}, failed: ${failed}; digests sent: ${digestsSent}, failed: ${digestsFailed}`,
  );

  return NextResponse.json({
    matchedTrackerRows: matchedRows,
    usersEmailed: sent,
    failed,
    digestsSent,
    digestsFailed,
    ...(errors.length ? { errors } : {}),
  });
}
