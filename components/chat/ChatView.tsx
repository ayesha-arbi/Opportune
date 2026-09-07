"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, Copy, PanelLeft, Sparkles } from "lucide-react";
import { authHeader } from "@/lib/supabase/client";
import { ChatSidebar, type ConversationSummary } from "@/components/chat/ChatSidebar";
import { Markdown } from "@/components/chat/Markdown";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import type { Opportunity, TrackerStatus } from "@/types/database";

type ThreadItem =
  | { kind: "text"; role: "user" | "assistant"; content: string; tools?: string[] }
  | { kind: "opportunities"; items: Opportunity[] };

const ACTIVITY_LABELS = [
  "Searching opportunities…",
  "Analyzing your request…",
  "Finding the best matches…",
  "Ranking matches…",
];

const TOOL_LABELS: Record<string, string> = {
  search_opportunities: "Searched the database",
  web_browse_opportunities: "Browsed the web",
  update_tracker_status: "Updated your tracker",
};

/** Copy button + tool-activity trail under an assistant reply. */
function MessageMeta({ tools, content }: { tools?: string[]; content: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions) — silently ignore.
    }
  };

  const toolText = tools?.length
    ? tools.map((tool) => TOOL_LABELS[tool] ?? tool).join(" · ")
    : null;

  return (
    <div className="mt-2 flex items-center gap-2.5">
      {toolText ? (
        <span className="text-xs text-text-muted">{toolText}</span>
      ) : null}
      <button
        type="button"
        onClick={() => void copy()}
        title="Copy reply"
        aria-label="Copy reply"
        className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-surface-soft hover:text-text-primary"
      >
        {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
      </button>
      {copied ? <span className="text-xs text-text-muted">Copied</span> : null}
    </div>
  );
}

const SUGGESTIONS = [
  "Find AI hackathons I can join this month",
  "What research opportunities are open to undergraduates?",
  "Find competitions related to machine learning",
  "What should I apply to based on my profile?",
];

export function ChatView({
  initialHistory,
  conversations,
  activeConversationId,
  userName,
}: {
  initialHistory: { role: "user" | "assistant"; content: string }[];
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const [thread, setThread] = useState<ThreadItem[]>(
    initialHistory.map((message) => ({ kind: "text", ...message })),
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Searching…");
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, TrackerStatus>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Sequential staged activity labels while the assistant works.
  useEffect(() => {
    if (!pending) return;
    let index = 0;
    setLoadingMessage(ACTIVITY_LABELS[0]);
    const timer = setInterval(() => {
      index = (index + 1) % ACTIVITY_LABELS.length;
      setLoadingMessage(ACTIVITY_LABELS[index]);
    }, 2200);
    return () => clearInterval(timer);
  }, [pending]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const refreshStatuses = useCallback(async () => {
    try {
      const response = await fetch("/api/tracker", {
        headers: await authHeader(),
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        items: { opportunity_id: string; status: TrackerStatus }[];
      };
      const next: Record<string, TrackerStatus> = {};
      for (const item of body.items ?? []) {
        next[item.opportunity_id] = item.status;
      }
      setStatuses(next);
    } catch {
      // Status sync is best-effort; the chat still works without it.
    }
  }, []);

  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, pending]);

  const send = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || pending) return;

    setError(null);
    setInput("");
    setPending(true);
    setThread((current) => [
      ...current,
      { kind: "text", role: "user", content: trimmed },
    ]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeader()),
        },
        body: JSON.stringify({
          message: trimmed,
          ...(activeConversationId
            ? { conversationId: activeConversationId }
            : {}),
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        reply?: string;
        opportunities?: Opportunity[];
        toolsUsed?: string[];
        conversationId?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.reply) {
        throw new Error(
          body?.error ?? "The assistant didn't respond — try again.",
        );
      }

      setThread((current) => [
        ...current,
        {
          kind: "text",
          role: "assistant",
          content: body.reply!,
          tools: body.toolsUsed?.length ? body.toolsUsed : undefined,
        },
        ...(body.opportunities?.length
          ? [{ kind: "opportunities" as const, items: body.opportunities! }]
          : []),
      ]);

      // Keep the URL pointing at the thread without a server reload
      // (which would drop the in-memory thread).
      if (!activeConversationId && body.conversationId) {
        window.history.replaceState(null, "", `/chat?c=${body.conversationId}`);
      }

      // The AI may have changed tracker state itself ("mark this as applied").
      if (body.toolsUsed?.includes("update_tracker_status")) {
        void refreshStatuses();
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Something went wrong.",
      );
    } finally {
      setPending(false);
    }
  };

  const isThreadEmpty = thread.length === 0 && !pending;

  return (
    <div className="flex h-screen relative bg-background">
      {sidebarOpen ? (
        <div 
          className="fixed inset-0 z-10 bg-[rgba(36,26,28,0.2)] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="absolute inset-y-0 left-0 z-20 md:static flex">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          userName={userName}
          onNavigate={() => {
            if (window.innerWidth < 768) {
              setSidebarOpen(false);
            }
          }}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen((open) => !open)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col relative bg-background">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((open) => !open)}
          className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-colors duration-150 hover:bg-surface-soft"
        >
          <PanelLeft size={18} strokeWidth={1.5} />
        </button>

        <div className={`min-h-0 flex-1 overflow-y-auto ${isThreadEmpty ? 'flex flex-col items-center justify-center' : ''}`}>
          <div className={`mx-auto w-full max-w-3xl px-6 py-8 ${isThreadEmpty ? '' : 'flex flex-col justify-end min-h-full'}`}>
            {isThreadEmpty ? (
              <div className="text-center">
                <h2 className="font-serif text-[32px] text-text-primary">What can I help with?</h2>
              </div>
            ) : null}

            {!isThreadEmpty && thread.map((item, index) =>
              item.kind === "text" ? (
                item.role === "user" ? (
                  <div key={index} className="message-in mt-6 flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-[4px] bg-surface-muted px-4 py-2.5 text-[15px] leading-relaxed text-text-primary">
                      {item.content}
                    </p>
                  </div>
                ) : (
                  <div key={index} className="message-in mt-6 flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                      <Sparkles size={14} strokeWidth={1.5} className="text-accent-dark" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[15px] leading-relaxed text-text-secondary [&>*:first-child]:mt-0">
                        <Markdown>{item.content}</Markdown>
                      </div>
                      <MessageMeta tools={item.tools} content={item.content} />
                    </div>
                  </div>
                )
              ) : (
                <div key={index} className="message-in mt-4 ml-10 space-y-3">
                  {item.items.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      trackedStatus={statuses[opportunity.id]}
                      onSaved={(id, status) =>
                        setStatuses((current) => ({ ...current, [id]: status }))
                      }
                    />
                  ))}
                </div>
              ),
            )}

            {!isThreadEmpty && pending ? (
              <div className="mt-6 flex items-center gap-2 ml-10" aria-live="polite">
                <span className="blinking-cursor inline-block h-4 w-2.5 bg-text-primary" />
                <span className="text-sm text-text-muted">{loadingMessage}</span>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 text-sm text-error ml-10" role="alert">
                {error}
              </p>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-background from-50% to-transparent px-4 pb-4 pt-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {isThreadEmpty && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-xl border border-app-border bg-surface px-4 py-3 text-left text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-soft cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(input);
              }}
            >
              <div className="mx-auto max-w-3xl flex items-end gap-2 rounded-2xl border border-app-border bg-surface shadow-medium p-3 pl-5 focus-within:border-text-primary focus-within:shadow-[0_0_0_3px_rgba(36,26,28,0.06)]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask about hackathons, fellowships, competitions…"
                  aria-label="Message"
                  className="min-h-[24px] flex-1 resize-none bg-transparent py-[8px] text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
                  style={{ maxHeight: '160px' }}
                />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={pending || input.trim().length === 0}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-primary text-white transition-colors duration-150 hover:bg-[#2A2A2A] disabled:opacity-40"
                >
                  <ArrowUp size={18} strokeWidth={2} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
