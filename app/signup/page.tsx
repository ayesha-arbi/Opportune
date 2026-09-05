"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const inputClasses =
  "h-12 w-full rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-text-primary focus:shadow-[0_0_0_3px_rgba(36,26,28,0.06)] focus:outline-none";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      // full_name lands in raw_user_meta_data, where the
      // handle_new_user trigger picks it up for the profiles row.
      const { data, error: authError } =
        await getSupabaseBrowserClient().auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
      } else {
        // Email confirmation is enabled on the project.
        setConfirmationSent(true);
      }
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
          Create your account
        </h1>
        <p className="mt-1 text-[15px] text-text-tertiary">
          Two minutes of setup, then the AI does the searching.
        </p>

        {confirmationSent ? (
          <p className="mt-8 rounded-xl border border-app-border bg-surface p-4 text-[15px] text-text-secondary">
            Check <strong>{email}</strong> for a confirmation link, then log in.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="mb-1.5 block text-[13px] font-semibold text-text-secondary"
              >
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClasses}
                placeholder="Ayesha Khan"
              />
            </div>
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
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClasses}
                placeholder="At least 8 characters"
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
              {submitting ? "Creating account…" : "Sign up"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-text-tertiary">
          Already have an account?{" "}
          <Link href="/login" className="text-text-primary underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
