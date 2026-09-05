import { redirect } from "next/navigation";
import { createServerUserClient } from "@/lib/supabase/server";
import { ChatView } from "@/components/chat/ChatView";

export const dynamic = "force-dynamic";

type MessageRow = {
  conversation_id: string | null;
  role: string;
  content: string | null;
  created_at: string;
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const supabase = await createServerUserClient().catch(() => null);
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { c } = await searchParams;
  const activeConversationId = c ?? null;

  const [profileResult, messagesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    // Conversation summaries + the active thread are reads under RLS, so
    // they happen here server-side. The chat *flow* still only uses /api/chat.
    supabase
      .from("chat_messages")
      .select("conversation_id, role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  // Group messages into conversations (newest first). Titles come from the
  // oldest user message in each thread, ChatGPT-style.
  const conversationsMap = new Map<
    string,
    { id: string; title: string; lastAt: string }
  >();
  for (const message of (messagesResult.data ?? []) as MessageRow[]) {
    if (!message.conversation_id) continue;
    const existing = conversationsMap.get(message.conversation_id);
    if (!existing) {
      conversationsMap.set(message.conversation_id, {
        id: message.conversation_id,
        title: "",
        lastAt: message.created_at,
      });
    }
    const entry = conversationsMap.get(message.conversation_id)!;
    if (message.role === "user" && message.content) {
      entry.title = message.content;
    }
  }
  const conversations = [...conversationsMap.values()]
    .filter((conversation) => conversation.title)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 20);

  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (activeConversationId) {
    const { data: threadMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("conversation_id", activeConversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(50);
    history = (threadMessages ?? [])
      .reverse()
      .filter((message) => message.content)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content as string,
      }));
  }

  return (
    <ChatView
      initialHistory={history}
      conversations={conversations}
      activeConversationId={activeConversationId}
      userName={profileResult.data?.full_name ?? null}
    />
  );
}
