import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";

const ASSIGNMENT_SELECT = `
  id,
  issue_group_id,
  assigned_to,
  assigned_by,
  status,
  notes,
  assigned_at,
  updated_at,
  assignee:assigned_to (
    id,
    email
  ),
  assigner:assigned_by (
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

  const auth = await requirePermission(supabase, "view:findings");
  if (isAuthError(auth)) return auth;

  const { data: assignment, error: assignmentErr } = await supabase
    .from("issue_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("issue_group_id", id)
    .maybeSingle();

  if (assignmentErr) {
    return serverError(assignmentErr, "Fetch assignment");
  }

  return NextResponse.json({ assignment });
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const { assigned_to, status, notes } = body;

  const { data: group, error: groupErr } = await supabase
    .from("issue_groups")
    .select("id, project_id, projects(org_id)")
    .eq("id", id)
    .single();

  if (groupErr || !group) {
    return NextResponse.json({ error: "Issue group not found" }, { status: 404 });
  }

  const orgId = (group.projects as any)?.org_id;
  const auth = await requirePermission(supabase, "assign:issues", orgId);
  if (isAuthError(auth)) return auth;

  if (assigned_to) {
    const { data: assigneeMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", assigned_to)
      .maybeSingle();

    if (!assigneeMember) {
      return NextResponse.json({ error: "Assignee is not a member of this organization" }, { status: 400 });
    }
  }

  const { data: assignment, error: assignmentErr } = await supabase
    .from("issue_assignments")
    .upsert(
      {
        issue_group_id: id,
        assigned_to: assigned_to || null,
        assigned_by: auth.user.id,
        status: status || "assigned",
        notes: notes || null
      },
      { onConflict: "issue_group_id" }
    )
    .select(ASSIGNMENT_SELECT)
    .single();

  if (assignmentErr) {
    return serverError(assignmentErr, "Create/update assignment");
  }

  return NextResponse.json({ assignment });
}


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "assign:issues");
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const { status, notes } = body;

  if (!status && !notes) {
    return NextResponse.json({ error: "At least one field (status or notes) is required" }, { status: 400 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const { data: assignment, error: updateErr } = await supabase
    .from("issue_assignments")
    .update(updateData)
    .eq("issue_group_id", id)
    .select(ASSIGNMENT_SELECT)
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return serverError(updateErr, "Update assignment");
  }

  return NextResponse.json({ assignment });
}


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const auth = await requirePermission(supabase, "assign:issues");
  if (isAuthError(auth)) return auth;

  const { error: deleteErr } = await supabase
    .from("issue_assignments")
    .delete()
    .eq("issue_group_id", id);

  if (deleteErr) {
    return serverError(deleteErr, "Delete assignment");
  }

  return NextResponse.json({ success: true });
}
