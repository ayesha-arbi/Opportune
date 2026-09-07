/**
 * Backfill opportunity embeddings for semantic matching (Phase 8).
 *
 * Prerequisites:
 *   - Migration 005_pgvector_semantic.sql applied (adds the embedding column)
 *   - EMBEDDING_API_KEY set in .env (OpenAI-compatible embeddings endpoint)
 *   - SUPABASE_SERVICE_ROLE_KEY set in .env (bypasses RLS for the batch update)
 *
 * Run from the repo root:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * Only rows with a null embedding are processed, so the script is safely
 * re-runnable and the scraper's incremental inserts can be backfilled the
 * same way.
 */
import { createClient } from "@supabase/supabase-js";

const EMBEDDING_BASE_URL =
  process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.",
  );
  process.exit(1);
}
if (!EMBEDDING_API_KEY) {
  console.error(
    "Missing EMBEDDING_API_KEY in the environment — set it in .env first.",
  );
  process.exit(1);
}

// The service role key never leaves the server; this script is local-only.
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function embedText(text: string): Promise<string> {
  const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EMBEDDING_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Embedding request failed (${response.status}): ${body.slice(0, 200)}`,
    );
  }
  const json = (await response.json()) as { data?: { embedding: number[] }[] };
  const vector = json.data?.[0]?.embedding;
  if (!vector?.length) throw new Error("Empty embedding response");
  return JSON.stringify(vector);
}

function opportunityText(opportunity: {
  title: string;
  description: string | null;
  organizer: string | null;
  field_tags: string[] | null;
}): string {
  return [
    opportunity.title,
    opportunity.organizer,
    opportunity.description?.slice(0, 2000),
    opportunity.field_tags?.length
      ? `Topics: ${opportunity.field_tags.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function main() {
  const batchSize = 50;
  let processed = 0;
  let failed = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from("opportunities")
      .select("id, title, description, organizer, field_tags")
      .is("embedding", null)
      .limit(batchSize);

    if (error) {
      console.error("Failed to load opportunities:", error.message);
      process.exit(1);
    }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      try {
        const embedding = await embedText(opportunityText(row));
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({ embedding, embedding_model: EMBEDDING_MODEL })
          .eq("id", row.id);
        if (updateError) throw new Error(updateError.message);
        processed++;
        console.log(`Embedded: ${row.title}`);
      } catch (rowError) {
        failed++;
        console.error(
          `Failed to embed "${row.title}":`,
          rowError instanceof Error ? rowError.message : rowError,
        );
      }
    }
  }

  console.log(
    `\nDone. Embedded ${processed} opportunities, ${failed} failed. Rows without embeddings can be retried by re-running this script.`,
  );
}

void main();
