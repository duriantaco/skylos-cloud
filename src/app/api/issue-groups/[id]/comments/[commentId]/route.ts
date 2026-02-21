import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { comment_text } = body;

  if (!comment_text || typeof comment_text !== "string" || !comment_text.trim()) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const { data: comment, error: updateErr } = await supabase
    .from("issue_comments")
    .update({ comment_text: comment_text.trim() })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select(`
      id,
      comment_text,
      mentioned_user_ids,
      created_at,
      updated_at,
      user_id,
      users:user_id (
        id,
        email
      )
    `)
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      return NextResponse.json({ error: "Comment not found or access denied" }, { status: 404 });
    }
    return serverError(updateErr, "Update comment");
  }

  return NextResponse.json({ comment });
}


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: deleteErr } = await supabase
    .from("issue_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (deleteErr) {
    return serverError(deleteErr, "Delete comment");
  }

  return NextResponse.json({ success: true });
}
