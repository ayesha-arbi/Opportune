"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const inputClasses =
  "h-12 w-full rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-text-primary focus:shadow-[0_0_0_3px_rgba(36,26,28,0.06)] focus:outline-none";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: authError } =
        await getSupabaseBrowserClient().auth.signInWithPassword({
          email,
          password,
        });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Supabase is not configured — set the environment variables.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-onboard">
        <h1 className="font-serif text-[26px] leading-tight text-text-primary">
          Log in to Opportune
        </h1>
        <p className="mt-1 text-[15px] text-text-tertiary">
          Welcome back — your deadlines are waiting.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-semibold text-text-secondary"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClasses}
              placeholder="you@university.edu"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-text-secondary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClasses}
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-full bg-text-primary text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:opacity-60"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-text-tertiary">
          New here?{" "}
          <Link href="/signup" className="text-text-primary underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
