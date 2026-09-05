/** Shared option lists (onboarding form + profile display). */

export const EDUCATION_LEVELS = [
  { value: "high_school", label: "High school" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate (master's)" },
  { value: "phd", label: "PhD" },
  { value: "postdoc", label: "Postdoc" },
  { value: "professional", label: "Working professional" },
] as const;

export const GOAL_TYPES = [
  { value: "hackathons", label: "Hackathons" },
  { value: "research", label: "Research" },
  { value: "fellowships", label: "Fellowships" },
  { value: "competitions", label: "Competitions" },
  { value: "grants", label: "Grants & scholarships" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "exploring", label: "Still exploring" },
] as const;

export function educationLabel(value: string | null): string | null {
  return EDUCATION_LEVELS.find((level) => level.value === value)?.label ?? null;
}

export function goalTypeLabel(value: string | null): string | null {
  return GOAL_TYPES.find((goal) => goal.value === value)?.label ?? null;
}
