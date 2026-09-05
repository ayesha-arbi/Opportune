"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

/**
 * Tag entry for interests/skills/goals — the one place rounded pills are
 * correct (tags are a collection pattern, not a status). Enter or comma
 * adds a tag; Backspace on an empty field removes the last one.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 10,
  ariaLabel,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const tag = draft.trim().replace(/,+$/, "");
    if (!tag || value.includes(tag) || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addDraft();
    } else if (event.key === "Backspace" && draft === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-[rgba(36,26,28,0.10)] bg-white/65 px-3 py-2 focus-within:border-text-primary focus-within:shadow-[0_0_0_3px_rgba(36,26,28,0.06)]">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-tag px-3 py-1 text-xs font-medium text-[#5E4547]"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-[#5E4547]/60 hover:text-text-primary"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        aria-label={ariaLabel}
        placeholder={value.length ? "" : placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={addDraft}
        onKeyDown={handleKeyDown}
        className="min-w-24 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
      />
    </div>
  );
}
