import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

const COMMENT_SELECT = `
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
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data: group, error: groupErr } = await supabase
    .from("issue_groups")
    .select("id, project_id, projects(org_id)")
    .eq("id", id)
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: "Issue group not found" }, { status: 404 });
  }

  const orgId = (group.projects as any)?.org_id;
  const auth = await requirePermission(supabase, "view:findings", orgId);
  if (isAuthError(auth)) return auth;

  const { data: comments, error: commentsErr, count } = await supabase
    .from("issue_comments")
    .select(COMMENT_SELECT, { count: 'exact' })
    .eq("issue_group_id", id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (commentsErr) {
    return serverError(commentsErr, "Fetch comments");
  }

  return NextResponse.json({
    comments: comments || [],
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const { comment_text, mentioned_user_ids } = body;

  if (!comment_text || typeof comment_text !== "string" || !comment_text.trim()) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const { data: group, error: groupErr } = await supabase
    .from("issue_groups")
    .select("id, project_id, projects(org_id)")
    .eq("id", id)
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: "Issue group not found" }, { status: 404 });
  }

  const orgId = (group.projects as any)?.org_id;
  const auth = await requirePermission(supabase, "comment:issues", orgId);
  if (isAuthError(auth)) return auth;

  const { data: comment, error: commentErr } = await supabase
    .from("issue_comments")
    .insert({
      issue_group_id: id,
      user_id: auth.user.id,
      comment_text: comment_text.trim(),
      mentioned_user_ids: Array.isArray(mentioned_user_ids) ? mentioned_user_ids : []
    })
    .select(COMMENT_SELECT)
    .single();

  if (commentErr) {
    return serverError(commentErr, "Create comment");
  }

  return NextResponse.json({ comment });
}
