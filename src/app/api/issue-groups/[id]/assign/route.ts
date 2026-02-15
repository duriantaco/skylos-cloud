import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";

/**
 * GET /api/issue-groups/[id]/assign
 * Get current assignment for an issue group
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch assignment with user info
  const { data: assignment, error: assignmentErr } = await supabase
    .from("issue_assignments")
    .select(`
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
    `)
    .eq("issue_group_id", id)
    .maybeSingle();

  if (assignmentErr) {
    return serverError(assignmentErr, "Fetch assignment");
  }

  return NextResponse.json({ assignment });
}

/**
 * POST /api/issue-groups/[id]/assign
 * Assign an issue to a team member
 */
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
  const { assigned_to, status, notes } = body;

  // Verify user has access to this issue group
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

  // If assigned_to is provided, verify they're also in the organization
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

  // Upsert assignment (unique constraint on issue_group_id)
  const { data: assignment, error: assignmentErr } = await supabase
    .from("issue_assignments")
    .upsert(
      {
        issue_group_id: id,
        assigned_to: assigned_to || null,
        assigned_by: user.id,
        status: status || "assigned",
        notes: notes || null
      },
      { onConflict: "issue_group_id" }
    )
    .select(`
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
    `)
    .single();

  if (assignmentErr) {
    return serverError(assignmentErr, "Create/update assignment");
  }

  // TODO: Send notification to assigned user
  // if (assigned_to) {
  //   await sendAssignmentNotification(assigned_to, assignment);
  // }

  return NextResponse.json({ assignment });
}

/**
 * PATCH /api/issue-groups/[id]/assign
 * Update assignment status or notes
 */
export async function PATCH(
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
  const { status, notes } = body;

  if (!status && !notes) {
    return NextResponse.json({ error: "At least one field (status or notes) is required" }, { status: 400 });
  }

  // Build update object
  const updateData: any = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  // Update assignment
  const { data: assignment, error: updateErr } = await supabase
    .from("issue_assignments")
    .update(updateData)
    .eq("issue_group_id", id)
    .select(`
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
    `)
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116") {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    return serverError(updateErr, "Update assignment");
  }

  return NextResponse.json({ assignment });
}

/**
 * DELETE /api/issue-groups/[id]/assign
 * Unassign an issue
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete assignment
  const { error: deleteErr } = await supabase
    .from("issue_assignments")
    .delete()
    .eq("issue_group_id", id);

  if (deleteErr) {
    return serverError(deleteErr, "Delete assignment");
  }

  return NextResponse.json({ success: true });
}
