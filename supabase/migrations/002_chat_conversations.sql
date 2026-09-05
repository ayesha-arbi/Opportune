-- ============================================
-- 002: CHAT CONVERSATIONS
-- Adds per-thread scoping to chat_messages so the ChatGPT-style sidebar
-- can list conversations and "New chat" starts a fresh context.
-- Run in the Supabase SQL editor (applies on top of 001).
-- ============================================

alter table public.chat_messages
add column if not exists conversation_id uuid;

create index if not exists chat_messages_conversation_idx
on public.chat_messages(user_id, conversation_id, created_at);
