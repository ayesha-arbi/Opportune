import { NextResponse } from "next/server";
import { getAuthenticatedUser, UnauthorizedError } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// DELETE /api/chat/conversations/[conversationId] - Delete a conversation
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    const { conversationId } = await params;

    // Validate conversation ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Delete all messages in the conversation (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId);

    if (deleteError) {
      console.error("Failed to delete conversation:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}