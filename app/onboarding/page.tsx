"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TagInput } from "@/components/common/TagInput";
import { EDUCATION_LEVELS, GOAL_TYPES } from "@/lib/constants";

const inputClasses =
  "h-12 w-full rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-4 text-[15px] text-text-primary placeholder:text-text-muted focus:border-text-primary focus:shadow-[0_0_0_3px_rgba(36,26,28,0.06)] focus:outline-none";

const textareaClasses =
  "w-full rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-4 py-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-text-primary focus:shadow-[0_0_0_3px_rgba(36,26,28,0.06)] focus:outline-none resize-none";

const selectWrapperClasses = "relative";
const chevronClasses =
  "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary";

interface FormState {
  full_name: string;
  bio: string;
  education_level: string;
  university: string;
  field_of_study: string;
  interests: string[];
  skills: string[];
  goal_type: string;
  goals: string[];
  location: string;
  remote_preference: boolean;
  dream_opportunity: string;
  biggest_challenge: string;
  fun_fact: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  bio: "",
  education_level: "",
  university: "",
  field_of_study: "",
  interests: [],
  skills: [],
  goal_type: "",
  goals: [],
  location: "",
  remote_preference: false,
  dream_opportunity: "",
  biggest_challenge: "",
  fun_fact: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-text-secondary">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!cancelled) {
          setUserId(data.user.id);
          if (profile) {
            setForm({
              full_name: profile.full_name ?? "",
              bio: profile.bio ?? "",
              education_level: profile.education_level ?? "",
              university: profile.university ?? "",
              field_of_study: profile.field_of_study ?? "",
              interests: profile.interests ?? [],
              skills: profile.skills ?? [],
              goal_type: profile.goal_type ?? "",
              goals: profile.goals ?? [],
              location: profile.location ?? "",
              remote_preference: profile.remote_preference ?? false,
              dream_opportunity: profile.dream_opportunity ?? "",
              biggest_challenge: profile.biggest_challenge ?? "",
              fun_fact: profile.fun_fact ?? "",
            });
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Supabase is not configured — set the environment variables.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const set = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const calculateCompletion = () => {
    const fields = [
      form.full_name,
      form.education_level,
      form.university,
      form.field_of_study,
      form.interests.length > 0,
      form.skills.length > 0,
      form.goal_type,
      form.goals.length > 0,
      form.location,
    ];
    const completed = fields.filter(f => f).length;
    return Math.round((completed / fields.length) * 100);
  };

  useEffect(() => {
    setCompletionPercentage(calculateCompletion());
  }, [form]);

  const validateStep = (): string | null => {
    return null;
  };

  const next = () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => current + 1);
  };

  const buildPayload = () => {
    return {
      id: userId as string,
      full_name: form.full_name || null,
      bio: form.bio || null,
      education_level: form.education_level || null,
      university: form.university || null,
      field_of_study: form.field_of_study || null,
      interests: form.interests,
      skills: form.skills,
      goal_type: form.goal_type || null,
      goals: form.goals,
      location: form.location || null,
      remote_preference: form.remote_preference,
      dream_opportunity: form.dream_opportunity || null,
      biggest_challenge: form.biggest_challenge || null,
      fun_fact: form.fun_fact || null,
    };
  };

  const skip = async () => {
    if (!userId) {
      router.replace("/dashboard");
      return;
    }
    setSubmitting(true);
    try {
      await getSupabaseBrowserClient().from("profiles").upsert(buildPayload());
    } catch {
      // Best-effort save on skip
    } finally {
      setSubmitting(false);
      router.replace("/dashboard");
      router.refresh();
    }
  };

  const submit = async () => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: upsertError } = await getSupabaseBrowserClient()
        .from("profiles")
        .upsert(buildPayload());
      if (upsertError) {
        setError(upsertError.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not save your profile — is Supabase configured?");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-text-tertiary">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-onboard">
        <p className="text-[13px] font-semibold text-text-tertiary">
          Step {step} of 5
        </p>
        <div className="mt-2 mb-4 h-2 w-full rounded-full bg-app-border overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
        <p className="text-[13px] font-semibold text-text-tertiary">
          Profile completion: {completionPercentage}%
        </p>
        <h1 className="mt-1 font-serif text-[22px] sm:text-[26px] leading-tight text-text-primary">
          {step === 1 && "Let's get to know you"}
          {step === 2 && "Your background"}
          {step === 3 && "Interests & skills"}
          {step === 4 && "Goals & preferences"}
          {step === 5 && "One more thing"}
        </h1>
        <p className="mt-1 text-[14px] sm:text-[15px] text-text-tertiary">
          {step === 1 && "We'd love to know who you are."}
          {step === 2 && "Where you are in your journey."}
          {step === 3 && "What you're into — this drives every recommendation."}
          {step === 4 && "What you're working towards."}
          {step === 5 && "Totally optional — but it helps us get to know you better."}
        </p>
        {step === 1 && (
          <div className="mt-4 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/50">
            <p className="text-sm text-text-secondary">
              <strong>Why complete your profile?</strong> Your information helps our AI find opportunities that match your specific interests, education level, and goals. The more you share, the better your recommendations will be!
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {step === 1 && (
            <>
              <Field label="Full name">
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(event) => set("full_name", event.target.value)}
                  className={inputClasses}
                  placeholder="Your full name"
                />
              </Field>
              <Field label="Bio">
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(event) => set("bio", event.target.value)}
                  className={textareaClasses}
                  placeholder="Tell us a bit about yourself — what you're working on, what excites you, or anything you'd like us to know…"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/50">
                <p className="text-sm text-text-secondary">
                  <strong>Education matters!</strong> Your education level and field of study help us match you with opportunities appropriate for your academic stage and expertise level.
                </p>
              </div>
              <Field label="Education level">
                <div className={selectWrapperClasses}>
                  <select
                    aria-label="Education level"
                    value={form.education_level}
                    onChange={(event) =>
                      set("education_level", event.target.value)
                    }
                    className={`${inputClasses} appearance-none pr-10`}
                  >
                    <option value="">Select…</option>
                    {EDUCATION_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={chevronClasses} />
                </div>
              </Field>
              <Field label="University">
                <input
                  type="text"
                  value={form.university}
                  onChange={(event) => set("university", event.target.value)}
                  className={inputClasses}
                  placeholder="e.g. NUST"
                />
              </Field>
              <Field label="Field of study">
                <input
                  type="text"
                  value={form.field_of_study}
                  onChange={(event) =>
                    set("field_of_study", event.target.value)
                  }
                  className={inputClasses}
                  placeholder="e.g. Computer Science"
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-4 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/50">
                <p className="text-sm text-text-secondary">
                  <strong>Interests & skills drive recommendations!</strong> These are the primary factors our AI uses to find opportunities that match what you're passionate about and good at.
                </p>
              </div>
              <Field label={`Interests (${form.interests.length}/10)`}>
                <TagInput
                  ariaLabel="Add interest"
                  value={form.interests}
                  onChange={(tags) => set("interests", tags)}
                  placeholder="Type an interest and press Enter — e.g. machine learning"
                  max={10}
                />
              </Field>
              <Field label={`Skills (${form.skills.length}/15)`}>
                <TagInput
                  ariaLabel="Add skill"
                  value={form.skills}
                  onChange={(tags) => set("skills", tags)}
                  placeholder="Type a skill and press Enter — e.g. Python"
                  max={15}
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <div className="mb-4 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/50">
                <p className="text-sm text-text-secondary">
                  <strong>Your goals shape recommendations!</strong> Whether you're looking for research, competitions, or funding opportunities, knowing your goals helps us prioritize the most relevant matches.
                </p>
              </div>
              <Field label="Main goal">
                <div className={selectWrapperClasses}>
                  <select
                    aria-label="Main goal"
                    value={form.goal_type}
                    onChange={(event) => set("goal_type", event.target.value)}
                    className={`${inputClasses} appearance-none pr-10`}
                  >
                    <option value="">Select…</option>
                    {GOAL_TYPES.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={chevronClasses} />
                </div>
              </Field>
              <Field label={`Specific goals (${form.goals.length}/8)`}>
                <TagInput
                  ariaLabel="Add goal"
                  value={form.goals}
                  onChange={(tags) => set("goals", tags)}
                  placeholder="Type a goal and press Enter — e.g. publish a paper"
                  max={8}
                />
              </Field>
              <Field label="Location">
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => set("location", event.target.value)}
                  className={inputClasses}
                  placeholder="e.g. Islamabad, Pakistan"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-app-border bg-surface/65 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.remote_preference}
                  onChange={(event) =>
                    set("remote_preference", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#241A1C]"
                />
                <span className="text-[15px] text-text-secondary">
                  Prefer remote opportunities
                </span>
              </label>
              <Field label="Dream opportunity">
                <textarea
                  rows={3}
                  value={form.dream_opportunity}
                  onChange={(event) => set("dream_opportunity", event.target.value)}
                  className={textareaClasses}
                  placeholder="Describe your dream opportunity — what would it look like if you could design it yourself?"
                />
              </Field>
              <Field label="Biggest challenge">
                <textarea
                  rows={3}
                  value={form.biggest_challenge}
                  onChange={(event) => set("biggest_challenge", event.target.value)}
                  className={textareaClasses}
                  placeholder="What's the biggest challenge you face when looking for opportunities?"
                />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <div className="mb-4 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/50">
                <p className="text-sm text-text-secondary">
                  <strong>Last step! 🎉</strong> This is totally optional — but these details help us personalize your experience and make our AI assistant even more helpful for you.
                </p>
              </div>
              <Field label="Fun fact">
                <textarea
                  rows={4}
                  value={form.fun_fact}
                  onChange={(event) => set("fun_fact", event.target.value)}
                  className={textareaClasses}
                  placeholder="A fun fact, a side project you're proud of, something quirky about you — anything goes!"
                />
              </Field>
            </>
          )}

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={skip}
                className="rounded-full px-4 py-2 text-sm font-medium text-text-tertiary transition-colors duration-150 hover:bg-[rgba(36,26,28,0.05)] hover:text-text-primary"
              >
                Skip for now
              </button>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep((current) => current - 1);
                  }}
                  className="rounded-full px-4 py-2 text-sm font-medium text-text-tertiary transition-colors duration-150 hover:bg-[rgba(36,26,28,0.05)] hover:text-text-primary"
                >
                  Back
                </button>
              )}
            </div>
            
            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="h-11 w-full sm:w-auto rounded-full bg-text-primary px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A]"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="h-11 w-full sm:w-auto rounded-full bg-text-primary px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Complete Profile"}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Success Message Overlay */}
      {submitting && step === 5 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-serif text-xl text-text-primary mb-2">Profile Complete!</h2>
            <p className="text-sm text-text-secondary">You'll get personalized recommendations now.</p>
          </div>
        </div>
      )}
    </main>
  );
}
