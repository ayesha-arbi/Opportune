import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REMINDER_WINDOW_DAYS = 3;

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

/**
 * Deadline reminder cron endpoint (Vercel Cron calls it daily with GET).
 * Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when the
 * CRON_SECRET env var is set; requests without it are rejected.
 */
function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[notifications] CRON_SECRET is not set — rejecting request");
    return false;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function sendReminderEmail(
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

function buildEmailHtml(name: string | null, items: ReminderItem[]): string {
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
      <h1 style="font-size:20px;color:#111827;">Upcoming deadlines</h1>
      <p style="font-size:14px;color:#374151;">
        ${greeting}, these opportunities on your tracker close within the next
        ${REMINDER_WINDOW_DAYS} days:
      </p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
        You're receiving this because you track these opportunities on Opportune.
      </p>
    </div>`;
}

function noReminders() {
  return NextResponse.json({
    matchedTrackerRows: 0,
    usersEmailed: 0,
    failed: 0,
  });
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
  const windowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  // 1. Opportunities whose deadline falls inside the reminder window.
  const { data: upcoming, error: opportunitiesError } = await supabase
    .from("opportunities")
    .select("id, title, deadline, source_url, application_url")
    .gte("deadline", now.toISOString())
    .lte("deadline", windowEnd.toISOString());
  if (opportunitiesError) {
    console.error("[notifications] opportunities query failed:", opportunitiesError);
    return NextResponse.json(
      { error: `Failed to load upcoming deadlines: ${opportunitiesError.message}` },
      { status: 500 },
    );
  }
  const upcomingList = upcoming ?? [];
  if (upcomingList.length === 0) return noReminders();

  // 2. Tracker rows for those opportunities that still need a reminder.
  const { data: trackerRows, error: trackerError } = await supabase
    .from("user_opportunities")
    .select("id, user_id, opportunity_id")
    .in(
      "opportunity_id",
      upcomingList.map((opportunity) => opportunity.id),
    )
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
  if (trackerList.length === 0) return noReminders();

  // 3. Emails for those users (profiles.email is synced from auth.users by trigger).
  const userIds = [...new Set(trackerList.map((row) => row.user_id))];
  const { data: profileRows, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
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
  const opportunityById = new Map(
    upcomingList.map((opportunity) => [opportunity.id, opportunity]),
  );

  // Group per user so each person gets one digest email.
  const groups = new Map<string, UserReminderGroup>();
  for (const row of trackerList) {
    const profile = profileById.get(row.user_id);
    const opportunity = opportunityById.get(row.opportunity_id);
    if (!profile?.email) {
      console.warn(
        `[notifications] skipping tracker row ${row.id}: user ${row.user_id} has no email`,
      );
      continue;
    }
    if (!opportunity) continue;
    const group = groups.get(row.user_id) ?? {
      email: profile.email,
      name: profile.full_name,
      items: [],
    };
    group.items.push({ trackerId: row.id, opportunity });
    groups.set(row.user_id, group);
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const group of groups.values()) {
    try {
      const subject =
        group.items.length === 1
          ? `Deadline reminder: ${group.items[0].opportunity.title}`
          : `${group.items.length} opportunities close within ${REMINDER_WINDOW_DAYS} days`;
      await sendReminderEmail(
        group.email,
        subject,
        buildEmailHtml(group.name, group.items),
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
      errors.push(`To ${group.email}: ${message}`);
      console.error("[notifications] email failed:", message);
    }
  }

  console.log(
    `[notifications] matched tracker rows: ${trackerList.length}, emails sent: ${sent}, failed: ${failed}`,
  );

  return NextResponse.json({
    matchedTrackerRows: trackerList.length,
    usersEmailed: sent,
    failed,
    ...(errors.length ? { errors } : {}),
  });
}

export { handle as GET, handle as POST };
