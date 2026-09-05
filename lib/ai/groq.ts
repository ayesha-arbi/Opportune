const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  tools?: ToolSchema[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Ordered list of candidate models for automatic fallback.
 * Tested and compatible with function/tool calling.
 */
export const DEFAULT_MODEL_CANDIDATES = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "gemma2-9b-it",
  "llama-3.1-8b-instant",
];

/**
 * Single model override for testing/debugging via GROQ_MODEL.
 */
export const OVERRIDE_MODEL = process.env.GROQ_MODEL || null;

function requireApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return apiKey;
}

/**
 * Cap on completion tokens. Without this, GroQ defaults to the
 * model's full output window. A chat reply needs ~2k.
 */
function maxTokensFor(options: GroqChatOptions): number {
  const fromEnv = Number(process.env.GROQ_MAX_TOKENS);
  const requested =
    options.maxTokens ??
    (Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 2048);
  return Math.min(Math.max(requested, 256), 8192);
}

/**
 * GroQ chat completion with automatic model fallback.
 * Tries candidates in order if rate-limited, unavailable, or errored.
 * Logs which model served the request.
 */
export async function groqChatCompletion(
  options: GroqChatOptions,
): Promise<GroqMessage> {
  const candidates = options.model
    ? [options.model]
    : OVERRIDE_MODEL
    ? [OVERRIDE_MODEL]
    : DEFAULT_MODEL_CANDIDATES;

  let lastError: string = "No model candidates provided";

  for (const candidate of candidates) {
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: candidate,
          messages: options.messages,
          max_tokens: maxTokensFor(options),
          ...(options.tools?.length
            ? { tools: options.tools, tool_choice: "auto" }
            : {}),
          temperature: options.temperature ?? 0.4,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        lastError = `Status ${response.status}: ${bodyText.slice(0, 300)}`;
        console.warn(
          `[Groq] Candidate model "${candidate}" failed (${lastError}). Trying next candidate...`,
        );
        continue;
      }

      const json = (await response.json()) as {
        choices?: { message?: GroqMessage }[];
        error?: { message?: string };
      };

      if (json.error?.message) {
        lastError = json.error.message;
        console.warn(
          `[Groq] Model "${candidate}" returned API error: ${lastError}. Trying next candidate...`,
        );
        continue;
      }

      const message = json.choices?.[0]?.message;
      if (!message) {
        lastError = "Returned empty choices response";
        console.warn(
          `[Groq] Model "${candidate}" returned empty choice. Trying next candidate...`,
        );
        continue;
      }

      console.log(`[Groq] Request successfully served by model: ${candidate}`);
      return message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Groq] Exception calling model "${candidate}": ${lastError}. Trying next candidate...`,
      );
    }
  }

  throw new Error(
    `All Groq model candidates failed. Last error: ${lastError}`,
  );
}
