import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";

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

  // Plan gate: issue assignment requires Pro
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();
  const effectivePlan = getEffectivePlan({ plan: org?.plan || "free", pro_expires_at: org?.pro_expires_at });
  const planCheck = requirePlan(effectivePlan, "pro", "Issue Assignment");
  if (!planCheck.ok) return planCheck.response;

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

  // Plan gate: assignment management requires Pro
  const { data: group } = await supabase
    .from("issue_groups")
    .select("project_id, projects(org_id)")
    .eq("id", id)
    .single();
  if (group) {
    const patchOrgId = (group.projects as any)?.org_id;
    const { data: patchOrg } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", patchOrgId)
      .single();
    const patchPlan = getEffectivePlan({ plan: patchOrg?.plan || "free", pro_expires_at: patchOrg?.pro_expires_at });
    const patchPlanCheck = requirePlan(patchPlan, "pro", "Issue Assignment");
    if (!patchPlanCheck.ok) return patchPlanCheck.response;
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

  // Plan gate: assignment management requires Pro
  const { data: delGroup } = await supabase
    .from("issue_groups")
    .select("project_id, projects(org_id)")
    .eq("id", id)
    .single();
  if (delGroup) {
    const delOrgId = (delGroup.projects as any)?.org_id;
    const { data: delOrg } = await supabase
      .from("organizations")
      .select("plan, pro_expires_at")
      .eq("id", delOrgId)
      .single();
    const delPlan = getEffectivePlan({ plan: delOrg?.plan || "free", pro_expires_at: delOrg?.pro_expires_at });
    const delPlanCheck = requirePlan(delPlan, "pro", "Issue Assignment");
    if (!delPlanCheck.ok) return delPlanCheck.response;
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
