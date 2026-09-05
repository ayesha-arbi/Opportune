import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAuthenticatedUser,
  UnauthorizedError,
} from "@/lib/supabase/server";
import {
  groqChatCompletion,
  type GroqMessage,
  type ToolSchema,
} from "@/lib/ai/groq";
import {
  fetchPage,
  extractOpportunity,
  createBrowsingConfig,
  getRemainingBudget,
} from "@/lib/ai/browsing-tools";
import {
  isOpportunityType,
  isTrackerStatus,
  isUuid,
  recordAppliedAt,
} from "@/lib/utils";
import type {
  Database,
  Json,
  Opportunity,
  OpportunityType,
  Profile,
} from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;
type TrackerInsert =
  Database["public"]["Tables"]["user_opportunities"]["Insert"];

export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 3;
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_SEARCH_LIMIT = 10;

const SEARCH_OPPORTUNITIES_TOOL: ToolSchema = {
  type: "function",
  function: {
    name: "search_opportunities",
    description:
      "Search the live opportunities database (hackathons, fellowships, competitions, research programs, grants). Returns real opportunities with real deadlines — always use this instead of relying on your own knowledge.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "hackathon",
            "fellowship",
            "competition",
            "research",
            "grant",
            "other",
          ],
          description: "Opportunity type to filter by. Omit for all types.",
        },
        field_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Field/topic tags to match, e.g. ['machine learning', 'ai']. Omit for all fields.",
        },
        deadline_before: {
          type: "string",
          description:
            "ISO 8601 datetime. Only opportunities with a deadline at or before this. Use end-of-day for date-only values, e.g. 2026-09-30T23:59:59Z.",
        },
        deadline_after: {
          type: "string",
          description:
            "ISO 8601 datetime. Only opportunities with a deadline at or after this.",
        },
        education_level: {
          type: "string",
          enum: [
            "high_school",
            "undergraduate",
            "graduate",
            "phd",
            "postdoc",
            "professional",
            "any",
          ],
          description:
            "Education level the opportunity must be open to. Omit or use 'any' for no filter.",
        },
        remote_only: {
          type: "boolean",
          description: "If true, only return fully remote opportunities.",
        },
        keywords: {
          type: "array",
          items: { type: "string" },
          description:
            "Free-text keywords matched against title, description, and tags, e.g. ['sustainability'].",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Max results to return. Defaults to 10.",
        },
      },
      additionalProperties: false,
    },
  },
};

const UPDATE_TRACKER_STATUS_TOOL: ToolSchema = {
  type: "function",
  function: {
    name: "update_tracker_status",
    description:
      "Save an opportunity to the user's tracker or update its status. Use when the user asks to save an opportunity or mark it as applied, submitted, accepted, or rejected. The opportunity_id must be one returned by search_opportunities in this conversation.",
    parameters: {
      type: "object",
      properties: {
        opportunity_id: {
          type: "string",
          description: "UUID of the opportunity, taken from search results.",
        },
        status: {
          type: "string",
          enum: ["saved", "applied", "submitted", "accepted", "rejected"],
          description: "New tracker status.",
        },
        notes: {
          type: "string",
          description: "Optional note to attach, e.g. application plans.",
        },
      },
      required: ["opportunity_id", "status"],
      additionalProperties: false,
    },
  },
};

const WEB_BROWSE_TOOL: ToolSchema = {
  type: "function",
  function: {
    name: "web_browse_opportunities",
    description:
      "Browse the web for opportunities when database search returns no results. Fetches pages from allowed domains and extracts structured opportunity data. Limited to a few fetches per request.",
    parameters: {
      type: "object",
      properties: {
        urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs to browse (must be from allowed domains: opportunitiescorners.com, opportunitiescircle.com, devpost.com, mlh.io)",
        },
      },
      required: ["urls"],
      additionalProperties: false,
    },
  },
};

const TOOLS = [SEARCH_OPPORTUNITIES_TOOL, UPDATE_TRACKER_STATUS_TOOL, WEB_BROWSE_TOOL];

interface SearchArgs {
  type?: OpportunityType;
  field_tags?: string[];
  deadline_before?: string;
  deadline_after?: string;
  education_level?: string;
  remote_only?: boolean;
  keywords?: string[];
  limit?: number;
}

interface TrackerArgs {
  opportunity_id: string;
  status: string;
  notes?: string;
}

function parseSearchArgs(raw: unknown): SearchArgs {
  const args = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const strings = (value: unknown, max: number): string[] | undefined =>
    Array.isArray(value)
      ? value
          .filter((v): v is string => typeof v === "string" && v.length > 0)
          .slice(0, max)
      : undefined;

  return {
    type: isOpportunityType(args.type) ? args.type : undefined,
    field_tags: strings(args.field_tags, 10),
    deadline_before:
      typeof args.deadline_before === "string"
        ? args.deadline_before
        : undefined,
    deadline_after:
      typeof args.deadline_after === "string" ? args.deadline_after : undefined,
    education_level:
      typeof args.education_level === "string" ? args.education_level : undefined,
    remote_only: args.remote_only === true,
    keywords: strings(args.keywords, 8),
    limit: typeof args.limit === "number" ? args.limit : undefined,
  };
}

/** Compact shape sent back to the model so tool results stay small. */
function toModelResult(opportunity: Opportunity) {
  return {
    id: opportunity.id,
    title: opportunity.title,
    type: opportunity.type,
    organizer: opportunity.organizer,
    deadline: opportunity.deadline,
    start_date: opportunity.start_date,
    location: opportunity.location,
    is_remote: opportunity.is_remote,
    eligibility: opportunity.eligibility,
    prize_info: opportunity.prize_info,
    field_tags: opportunity.field_tags,
    description: opportunity.description
      ? opportunity.description.slice(0, 400)
      : null,
    apply_url: opportunity.application_url ?? opportunity.source_url,
  };
}

async function executeSearchOpportunities(
  supabase: TypedSupabaseClient,
  args: SearchArgs,
): Promise<Opportunity[]> {
  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("is_active", true)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(Math.min(Math.max(args.limit ?? DEFAULT_SEARCH_LIMIT, 1), 20));

  if (args.type) query = query.eq("type", args.type);
  if (args.remote_only) query = query.eq("is_remote", true);
  if (args.deadline_before) query = query.lte("deadline", args.deadline_before);
  if (args.deadline_after) query = query.gte("deadline", args.deadline_after);
  if (args.field_tags?.length) {
    query = query.overlaps("field_tags", args.field_tags);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Opportunity search failed: ${error.message}`);
  let rows: Opportunity[] = data ?? [];

  // education_level lives in the jsonb eligibility blob and keywords are
  // free-text, so both are filtered post-query. Enough for seeded data;
  // pgvector ranking replaces this in a later phase.
  const edu = args.education_level?.toLowerCase();
  if (edu && edu !== "any") {
    rows = rows.filter((row) => {
      const levels = (row.eligibility?.edu_level ?? []).map((level) =>
        level.toLowerCase(),
      );
      // Opportunities with no stated education restriction are open to all.
      return (
        levels.length === 0 ||
        levels.some((level) => level.includes(edu) || edu.includes(level))
      );
    });
  }

  if (args.keywords?.length) {
    const keywords = args.keywords.map((keyword) => keyword.toLowerCase());
    rows = rows.filter((row) => {
      const haystack =
        `${row.title} ${row.description ?? ""} ${row.field_tags.join(" ")}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    });
  }

  return rows;
}

async function executeUpdateTrackerStatus(
  supabase: TypedSupabaseClient,
  userId: string,
  args: TrackerArgs,
): Promise<Record<string, unknown>> {
  if (!isUuid(args.opportunity_id)) {
    throw new Error("opportunity_id must be a valid UUID from search results");
  }
  if (!isTrackerStatus(args.status)) {
    throw new Error(
      `status must be one of: saved, applied, submitted, accepted, rejected`,
    );
  }

  // Upsert only the provided fields so an update never wipes existing notes.
  const payload: TrackerInsert = {
    user_id: userId,
    opportunity_id: args.opportunity_id,
    status: args.status,
  };
  if (args.notes !== undefined && args.notes !== null) {
    payload.notes = String(args.notes).slice(0, 5000);
  }

  const { data, error } = await supabase
    .from("user_opportunities")
    .upsert(payload, { onConflict: "user_id,opportunity_id" })
    .select("*")
    .single();
  if (error) throw new Error(`Tracker update failed: ${error.message}`);

  if (args.status === "applied") {
    await recordAppliedAt(supabase, userId, args.opportunity_id);
  }

  return { success: true, tracker: data };
}

async function executeWebBrowseOpportunities(
  supabase: TypedSupabaseClient,
  urls: string[],
): Promise<{ opportunities: Opportunity[]; errors: string[] }> {
  const browsingConfig = createBrowsingConfig(5); // 5 fetches per chat turn
  const opportunities: Opportunity[] = [];
  const errors: string[] = [];

  for (const url of urls) {
    if (getRemainingBudget(browsingConfig) <= 0) {
      errors.push("Fetch budget exceeded");
      break;
    }

    try {
      const page = await fetchPage(url, browsingConfig);
      
      if (page.error) {
        errors.push(`${url}: ${page.error}`);
        continue;
      }

      // Extract opportunity data using AI
      const extracted = await extractOpportunity(
        page.text,
        url,
        "web_browse",
        true, // check title for deadlines
        [], // no pre-existing tags
      );

      if (extracted) {
        // Upsert to database
        const { data, error: upsertError } = await supabase
          .from("opportunities")
          .upsert({
            ...extracted,
            is_active: true,
          }, {
            onConflict: "source_url",
          })
          .select()
          .single();

        if (upsertError) {
          errors.push(`${url}: Upsert failed - ${upsertError.message}`);
        } else if (data) {
          opportunities.push(data as Opportunity);
        }
      }
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { opportunities, errors };
}

function buildSystemPrompt(profile: Profile | null): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "You are Opportune, an assistant that helps students find and track opportunities: hackathons, research fellowships and programs, competitions, innovation challenges, entrepreneurship contests, and grants/scholarships.",
    `Today's date is ${today}. Always judge deadlines against this date.`,
    "",
    "Rules:",
    "- ONLY recommend opportunities that exist in the user's database. Use the search_opportunities tool to find them; never invent opportunities, deadlines, or links from your own knowledge.",
    "- NEVER recommend jobs, internships, or full-time positions.",
    "- When presenting recommendations, briefly explain WHY each one fits this user's profile (education, interests, skills, goals). Never just dump a list.",
    "- Use update_tracker_status when the user asks to save an opportunity or mark it applied/submitted/accepted/rejected. The opportunity_id must come from search results in this conversation.",
    "- If a search returns nothing relevant, say so honestly and suggest how to broaden it (different type, wider deadline window, fewer filters).",
    "- Keep answers concise and concrete.",
  ];

  if (profile) {
    lines.push(
      "",
      "The user's profile:",
      JSON.stringify({
        full_name: profile.full_name,
        education_level: profile.education_level,
        field_of_study: profile.field_of_study,
        university: profile.university,
        interests: profile.interests,
        skills: profile.skills,
        goals: profile.goals,
        goal_type: profile.goal_type,
        location: profile.location,
        remote_preference: profile.remote_preference,
      }),
    );
  } else {
    lines.push(
      "",
      "The user has not completed onboarding yet — search broadly, and invite them to fill in their profile for better recommendations.",
    );
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);

    const body = (await req.json().catch(() => null)) as {
      message?: unknown;
      userId?: unknown;
      conversationId?: unknown;
    } | null;
    // The user is always derived from the auth session — any client-supplied
    // userId is ignored.
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 },
      );
    }

    // Passing an existing conversationId continues that thread; omitting it
    // starts a fresh conversation ("New chat").
    const providedConversationId =
      typeof body?.conversationId === "string" && body.conversationId
        ? body.conversationId
        : null;
    if (providedConversationId && !isUuid(providedConversationId)) {
      return NextResponse.json(
        { error: "conversationId must be a valid UUID" },
        { status: 400 },
      );
    }
    const conversationId = providedConversationId ?? crypto.randomUUID();

    const [profileResult, historyResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      providedConversationId
        ? supabase
            .from("chat_messages")
            .select("role, content")
            .eq("user_id", user.id)
            .eq("conversation_id", providedConversationId)
            .in("role", ["user", "assistant"])
            .order("created_at", { ascending: false })
            .limit(MAX_HISTORY_MESSAGES)
        : Promise.resolve({
            data: [],
            error: null,
          } as { data: { role: string; content: string | null }[]; error: null }),
    ]);
    if (profileResult.error) throw new Error(profileResult.error.message);
    if (historyResult.error) throw new Error(historyResult.error.message);

    const profile = (profileResult.data as Profile | null) ?? null;
    const history = ((historyResult.data ?? []) as { role: string; content: string | null }[])
      .reverse()
      .filter((m) => m.content)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));

    const messages: GroqMessage[] = [
      { role: "system", content: buildSystemPrompt(profile) },
      ...history,
      { role: "user", content: message },
    ];

    const toolsUsed: { name: string; arguments: Json }[] = [];
    let lastSearchResults: Opportunity[] = [];
    let assistantMessage: GroqMessage | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      assistantMessage = await groqChatCompletion({ messages, tools: TOOLS });
      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (toolCalls.length === 0) break;

      for (const toolCall of toolCalls) {
        let parsedArgs: unknown = null;
        let resultJson: string;
        try {
          parsedArgs = toolCall.function.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {};

          if (toolCall.function.name === "search_opportunities") {
            const rows = await executeSearchOpportunities(
              supabase,
              parseSearchArgs(parsedArgs),
            );
            lastSearchResults = rows;
            resultJson = JSON.stringify(rows.map(toModelResult));
          } else if (toolCall.function.name === "update_tracker_status") {
            const args = (typeof parsedArgs === "object" && parsedArgs !== null
              ? parsedArgs
              : {}) as unknown as TrackerArgs;
            const result = await executeUpdateTrackerStatus(
              supabase,
              user.id,
              args,
            );
            resultJson = JSON.stringify(result);
          } else if (toolCall.function.name === "web_browse_opportunities") {
            const args = (typeof parsedArgs === "object" && parsedArgs !== null
              ? parsedArgs
              : {}) as { urls: string[] };
            const result = await executeWebBrowseOpportunities(
              supabase,
              args.urls || [],
            );
            // Add any extracted opportunities to lastSearchResults
            if (result.opportunities && result.opportunities.length > 0) {
              lastSearchResults = result.opportunities;
            }
            resultJson = JSON.stringify(result);
          } else {
            resultJson = JSON.stringify({
              error: `Unknown tool: ${toolCall.function.name}`,
            });
          }
        } catch (toolError) {
          resultJson = JSON.stringify({
            error:
              toolError instanceof Error
                ? toolError.message
                : "Tool execution failed",
          });
        }

        toolsUsed.push({
          name: toolCall.function.name,
          arguments: parsedArgs as Json,
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultJson,
        });
      }
    }

    if (!assistantMessage) {
      throw new Error("The model returned no response");
    }

    // If we ran out of tool rounds, force a final text-only answer.
    if (assistantMessage.tool_calls?.length) {
      assistantMessage = await groqChatCompletion({ messages });
    }

    const reply = assistantMessage.content ?? "";

    // Persist the exchange (best effort — never fail the chat over logging).
    try {
      await supabase.from("chat_messages").insert([
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "user",
          content: message,
        },
        {
          user_id: user.id,
          conversation_id: conversationId,
          role: "assistant",
          content: reply,
          tool_calls: toolsUsed.length ? toolsUsed : null,
        },
      ]);
    } catch (persistError) {
      console.error("[chat] failed to persist messages:", persistError);
    }

    return NextResponse.json({
      reply,
      opportunities: lastSearchResults,
      toolsUsed: toolsUsed.map((tool) => tool.name),
      conversationId,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[chat] unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 },
    );
  }
}
