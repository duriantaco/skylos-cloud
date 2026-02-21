import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";


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

  const updateData: any = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

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

  const { error: deleteErr } = await supabase
    .from("issue_assignments")
    .delete()
    .eq("issue_group_id", id);

  if (deleteErr) {
    return serverError(deleteErr, "Delete assignment");
  }

  return NextResponse.json({ success: true });
}
