import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  UnauthorizedError,
} from "@/lib/supabase/server";
import {
  isTrackerStatus,
  isUuid,
  recordAppliedAt,
} from "@/lib/utils";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

const MAX_NOTES_LENGTH = 5000;

type TrackerInsert = Database["public"]["Tables"]["user_opportunities"]["Insert"];

/** GET /api/tracker?status=saved — the user's tracked opportunities with opportunity details. */
export async function GET(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);

    const status = new URL(req.url).searchParams.get("status");
    if (status !== null && !isTrackerStatus(status)) {
      return NextResponse.json(
        {
          error:
            "status must be one of: saved, applied, submitted, accepted, rejected",
        },
        { status: 400 },
      );
    }

    let query = supabase
      .from("user_opportunities")
      .select("*, opportunity:opportunities(*)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[tracker] GET failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load tracker",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tracker — save or update a tracked opportunity.
 * Body: { opportunity_id, status?, notes? }. Creates the row if it doesn't
 * exist yet, otherwise updates only the provided fields (upsert on
 * user_id + opportunity_id).
 */
export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);

    const body = (await req.json().catch(() => null)) as {
      opportunity_id?: unknown;
      status?: unknown;
      notes?: unknown;
    } | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const opportunityId = body.opportunity_id;
    if (!isUuid(opportunityId)) {
      return NextResponse.json(
        { error: "opportunity_id must be a valid UUID" },
        { status: 400 },
      );
    }

    const status = body.status ?? "saved";
    if (!isTrackerStatus(status)) {
      return NextResponse.json(
        {
          error:
            "status must be one of: saved, applied, submitted, accepted, rejected",
        },
        { status: 400 },
      );
    }

    const notes =
      body.notes === undefined || body.notes === null
        ? undefined
        : body.notes;
    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > MAX_NOTES_LENGTH)
    ) {
      return NextResponse.json(
        {
          error: `notes must be a string of at most ${MAX_NOTES_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    // Make sure the opportunity exists before tracking it.
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", opportunityId)
      .maybeSingle();
    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 },
      );
    }

    // Only send provided fields so an update never wipes existing notes.
    const payload: TrackerInsert = {
      user_id: user.id,
      opportunity_id: opportunityId,
      status,
      ...(notes !== undefined ? { notes } : {}),
    };

    const { data, error } = await supabase
      .from("user_opportunities")
      .upsert(payload, { onConflict: "user_id,opportunity_id" })
      .select("*, opportunity:opportunities(*)")
      .single();
    if (error) throw new Error(error.message);

    if (status === "applied") {
      await recordAppliedAt(supabase, user.id, opportunityId);
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[tracker] POST failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update tracker",
      },
      { status: 500 },
    );
  }
}

/** DELETE /api/tracker?opportunity_id=<uuid> — remove a tracked opportunity. */
export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);

    const opportunityId = new URL(req.url).searchParams.get("opportunity_id");
    if (!isUuid(opportunityId)) {
      return NextResponse.json(
        { error: "opportunity_id query parameter must be a valid UUID" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("user_opportunities")
      .delete()
      .eq("user_id", user.id)
      .eq("opportunity_id", opportunityId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length) {
      return NextResponse.json(
        { error: "No tracked opportunity found for this id" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[tracker] DELETE failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete tracked opportunity",
      },
      { status: 500 },
    );
  }
}
