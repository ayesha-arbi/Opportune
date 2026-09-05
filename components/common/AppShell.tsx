"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, MessageSquare, Ticket, UserRound } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tracker", label: "Tracker", icon: Ticket },
  { href: "/profile", label: "Profile", icon: UserRound },
];

/**
 * The 72px icon-only rail. Labels appear as native tooltips on hover —
 * no text links at rest. Sign-out lives at the bottom.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await getSupabaseBrowserClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-[72px] shrink-0 flex-col items-center justify-between border-r border-app-border bg-surface py-4">
        <div className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 ${
                  active
                    ? "bg-accent-soft text-text-primary"
                    : "text-text-tertiary hover:bg-surface-soft hover:text-text-primary"
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          title="Log out"
          aria-label="Log out"
          onClick={signOut}
          disabled={signingOut}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-text-tertiary transition-colors duration-150 hover:bg-surface-soft hover:text-text-primary disabled:opacity-50"
        >
          <LogOut size={20} strokeWidth={1.5} />
        </button>
      </nav>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
