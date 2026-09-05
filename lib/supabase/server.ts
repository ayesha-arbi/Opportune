import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function requirePublicConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { url: SUPABASE_URL, key: PUBLISHABLE_KEY };
}

/**
 * Service-role client. Bypasses RLS entirely — only for server-side
 * privileged operations (the notification cron). NEVER import this from
 * a client component; the key must stay server-side.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const { url } = requirePublicConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Client that carries the caller's access token on every PostgREST request, so RLS applies as that user. */
function createBearerClient(accessToken: string): SupabaseClient<Database> {
  const { url, key } = requirePublicConfig();
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Server-component / route-handler client bound to the request's cookie
 * session, so every query runs under RLS as the signed-in user.
 */
export async function createServerUserClient(): Promise<SupabaseClient<Database>> {
  const { url, key } = requirePublicConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component render — safe to ignore,
            // middleware refreshes sessions there.
          }
        }
      },
    },
  });
}

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Resolve the authenticated user for an API request.
 * Prefers an `Authorization: Bearer <jwt>` header (easy to test with curl,
 * useful for future mobile clients), otherwise falls back to the
 * @supabase/ssr cookie session. Client-supplied user IDs are never trusted.
 */
export async function getAuthenticatedUser(req: Request): Promise<{
  user: User;
  supabase: SupabaseClient<Database>;
}> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    const { url, key } = requirePublicConfig();
    const verifier = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await verifier.auth.getUser(bearer);
    if (error || !data.user) {
      throw new UnauthorizedError("Invalid or expired access token");
    }
    return { user: data.user, supabase: createBearerClient(bearer) };
  }

  const supabase = await createServerUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new UnauthorizedError();
  }
  return { user: data.user, supabase };
}
