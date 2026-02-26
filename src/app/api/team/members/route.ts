import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError, type OrgRole } from "@/lib/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();

  const url = new URL(request.url);
  const orgId = url.searchParams.get("org_id") || undefined;

  const auth = await requirePermission(supabase, "view:members", orgId);
  if (isAuthError(auth)) return auth;

  const { data: members, error: membersErr } = await supabase
    .from("organization_members")
    .select(`
      user_id,
      role,
      users:user_id (
        id,
        email
      )
    `)
    .eq("org_id", auth.orgId);

  if (membersErr) {
    return serverError(membersErr, "Fetch team members");
  }

  return NextResponse.json(
    { members: members || [] },
    {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60'
      }
    }
  );
}

// PATCH /api/team/members — change a member's role
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const { user_id, role } = body;

  if (!user_id || !role) {
    return NextResponse.json({ error: "user_id and role are required" }, { status: 400 });
  }

  const validRoles: OrgRole[] = ["owner", "admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
  }

  // Cannot change own role
  if (user_id === auth.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  // Only owners can promote to owner
  if (role === "owner" && auth.member.role !== "owner") {
    return NextResponse.json({ error: "Only owners can promote to owner" }, { status: 403 });
  }

  // Check target is in same org
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", auth.orgId)
    .eq("user_id", user_id)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "User is not a member of this organization" }, { status: 404 });
  }

  // Cannot demote the last owner
  if (targetMember.role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("role", "owner");

    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last owner" }, { status: 400 });
    }
  }

  const { error: updateErr } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("org_id", auth.orgId)
    .eq("user_id", user_id);

  if (updateErr) {
    return serverError(updateErr, "Update member role");
  }

  return NextResponse.json({ success: true, user_id, role });
}

// DELETE /api/team/members — remove a member from the org
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "manage:members");
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  // Cannot remove self
  if (userId === auth.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  // Check target is in same org
  const { data: targetMember } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", auth.orgId)
    .eq("user_id", userId)
    .single();

  if (!targetMember) {
    return NextResponse.json({ error: "User is not a member of this organization" }, { status: 404 });
  }

  // Cannot remove the last owner
  if (targetMember.role === "owner") {
    const { count } = await supabase
      .from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", auth.orgId)
      .eq("role", "owner");

    if ((count || 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
    }
  }

  const { error: deleteErr } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", auth.orgId)
    .eq("user_id", userId);

  if (deleteErr) {
    return serverError(deleteErr, "Remove team member");
  }

  return NextResponse.json({ success: true });
}
