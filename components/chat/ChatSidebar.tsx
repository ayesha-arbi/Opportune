"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  MessageSquarePlus,
  Ticket,
  UserRound,
  Trash2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ConversationSummary {
  id: string;
  title: string;
  lastAt: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: Ticket },
  { href: "/profile", label: "Profile", icon: UserRound },
];

/**
 * ChatGPT-style sidebar (layout only — Opportune's own tokens): nav,
 * new chat, recent conversations, account at the bottom.
 */
export function ChatSidebar({
  conversations,
  activeConversationId,
  userName,
  onNavigate,
  collapsed = false,
  onToggle,
}: {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  userName: string | null;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        console.error('Failed to delete conversation');
        return;
      }
      
      // If the deleted conversation was active, redirect to new chat first
      if (activeConversationId === conversationId) {
        router.push('/chat');
      } else {
        // Otherwise just refresh to update the list
        router.refresh();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <aside
      className={`flex shrink-0 flex-col bg-surface transition-all duration-200 ease-in-out ${
        collapsed ? "w-0 overflow-hidden border-transparent" : "w-[260px] border-r border-app-border"
      }`}
    >
      <div className="px-4 pt-4">
        <Link
          href="/dashboard"
          className="font-serif text-xl text-text-primary"
        >
          Opportune
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            router.push("/chat");
          }}
          className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-app-border px-3 py-2.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-surface-soft"
        >
          <MessageSquarePlus size={18} strokeWidth={1.5} />
          New chat
        </button>
        <nav className="mt-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-accent-soft font-medium text-text-primary"
                    : "text-text-secondary hover:bg-surface-soft"
                }`}
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-4">
        <p className="px-3 text-[13px] font-semibold text-text-tertiary">
          Recents
        </p>
        <div className="mt-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted">
              No conversations yet
            </p>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.id === activeConversationId;
              return (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-1 rounded-xl transition-colors duration-150 ${
                    active
                      ? "bg-surface-soft"
                      : "hover:bg-surface-soft"
                  }`}
                >
                  <button
                    type="button"
                    title={conversation.title}
                    onClick={() => {
                      onNavigate?.();
                      router.push(`/chat?c=${conversation.id}`);
                    }}
                    className="flex-1 truncate rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150"
                  >
                    <span className={`${
                      active
                        ? "font-medium text-text-primary"
                        : "text-text-secondary"
                    }`}>
                      {conversation.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    title="Delete conversation"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary opacity-0 transition-all duration-150 hover:bg-app-soft hover:text-text-primary group-hover:opacity-100"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-app-border px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-text-primary">
          {(userName ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {userName ?? "Account"}
          </p>
        </div>
        <button
          type="button"
          title="Log out"
          aria-label="Log out"
          onClick={() => void signOut()}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-text-tertiary transition-colors duration-150 hover:bg-surface-soft hover:text-text-primary"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
