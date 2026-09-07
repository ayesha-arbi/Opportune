/**
 * Embeddings for semantic matching (Phase 8). Uses any OpenAI-compatible
 * embeddings endpoint — default is OpenAI text-embedding-3-small (1536 dims,
 * which must match the `vector(1536)` columns in migration 003).
 * The API key stays server-side only.
 */

const EMBEDDING_BASE_URL =
  process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1";
export const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "text-embedding-3-small";

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.EMBEDDING_API_KEY);
}

export function requireEmbeddingApiKey(): string {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    throw new Error(
      "EMBEDDING_API_KEY is not configured — semantic matching is disabled",
    );
  }
  return apiKey;
}

/** Returns the embedding as a pgvector literal string: "[0.01,0.02,...]" */
export async function embedText(text: string): Promise<string> {
  const response = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEmbeddingApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Embedding request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as { data?: { embedding: number[] }[] };
  const vector = json.data?.[0]?.embedding;
  if (!vector?.length) {
    throw new Error("Embedding response contained no vector");
  }
  return JSON.stringify(vector);
}

/** The text an opportunity is embedded from. */
export function opportunityEmbeddingText(opportunity: {
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

/** The text a user profile is embedded from. */
export function profileEmbeddingText(profile: {
  education_level: string | null;
  field_of_study: string | null;
  university: string | null;
  interests: string[] | null;
  skills: string[] | null;
  goals: string[] | null;
  goal_type: string | null;
}): string {
  return [
    `Education: ${profile.education_level ?? "unknown"}`,
    profile.field_of_study ? `Field of study: ${profile.field_of_study}` : null,
    profile.university ? `University: ${profile.university}` : null,
    profile.interests?.length ? `Interests: ${profile.interests.join(", ")}` : null,
    profile.skills?.length ? `Skills: ${profile.skills.join(", ")}` : null,
    profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : null,
    profile.goal_type ? `Main goal: ${profile.goal_type}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
