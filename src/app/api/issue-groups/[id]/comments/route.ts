import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Check user is member of organization
  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Fetch comments with user info (paginated)
  const { data: comments, error: commentsErr, count } = await supabase
    .from("issue_comments")
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
    `, { count: 'exact' })
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: comment, error: commentErr } = await supabase
    .from("issue_comments")
    .insert({
      issue_group_id: id,
      user_id: user.id,
      comment_text: comment_text.trim(),
      mentioned_user_ids: Array.isArray(mentioned_user_ids) ? mentioned_user_ids : []
    })
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

  if (commentErr) {
    return serverError(commentErr, "Create comment");
  }

  // TODO: Send notifications to mentioned users
  // if (mentioned_user_ids?.length > 0) {
  //   await sendMentionNotifications(mentioned_user_ids, comment);
  // }

  return NextResponse.json({ comment });
}
