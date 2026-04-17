import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import {
  getEffectiveExceptionStatus,
  logIssueGroupActivity,
} from "@/lib/exception-governance";

type IssueGroupProjectRelation =
  | { org_id?: string | null }
  | Array<{ org_id?: string | null }>
  | null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const justification =
    typeof body.justification === "string" ? body.justification.trim() : "";
  const expiresAt =
    typeof body.expires_at === "string" && body.expires_at.trim().length > 0
      ? body.expires_at.trim()
      : null;

  if (justification.length < 8) {
    return NextResponse.json(
      { error: "Add a clear justification before requesting an exception." },
      { status: 400 }
    );
  }

  if (expiresAt) {
    const timestamp = new Date(expiresAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
      return NextResponse.json(
        { error: "Expiry must be a valid future date." },
        { status: 400 }
      );
    }
  }

  const { data: group, error: groupError } = await supabase
    .from("issue_groups")
    .select(
      "id, project_id, rule_id, severity, canonical_file, canonical_line, status, projects(org_id)"
    )
    .eq("id", id)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: "Issue group not found" }, { status: 404 });
  }

  const projectRelation = group.projects as IssueGroupProjectRelation;
  const orgId = Array.isArray(projectRelation)
    ? projectRelation[0]?.org_id
    : projectRelation?.org_id;

  if (!orgId) {
    return NextResponse.json(
      { error: "Issue group is missing organization context." },
      { status: 400 }
    );
  }

  const auth = await requirePermission(supabase, "request:exceptions", orgId);
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", orgId)
    .single();
  const effectivePlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at,
  });
  const planCheck = requirePlan(effectivePlan, "pro", "Exception Governance");
  if (!planCheck.ok) return planCheck.response;

  const { data: existingRequests, error: existingError } = await supabase
    .from("policy_exception_requests")
    .select("id, status, expires_at")
    .eq("issue_group_id", group.id)
    .in("status", ["requested", "approved"]);

  if (existingError) {
    return serverError(existingError, "Check existing exception requests");
  }

  const pendingExisting = (existingRequests || []).find((row) => row.status === "requested");
  if (pendingExisting) {
    return NextResponse.json(
      {
        error: "There is already a pending exception request for this issue.",
        request_id: pendingExisting.id,
      },
      { status: 409 }
    );
  }

  const hasActiveApprovedException = (existingRequests || []).some(
    (row) => getEffectiveExceptionStatus(row.status, row.expires_at) === "approved"
  );

  if (hasActiveApprovedException) {
    return NextResponse.json(
      { error: "This issue already has an active approved exception." },
      { status: 409 }
    );
  }

  const snapshot = {
    rule_id: group.rule_id,
    severity: group.severity,
    canonical_file: group.canonical_file,
    canonical_line: group.canonical_line,
    prior_status: group.status,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("policy_exception_requests")
    .insert({
      org_id: orgId,
      project_id: group.project_id,
      issue_group_id: group.id,
      target_type: "issue_group",
      requested_by: auth.user.id,
      status: "requested",
      justification,
      scope_summary: "Suppress this recurring issue group across future scans.",
      snapshot,
      expires_at: expiresAt,
    })
    .select(
      "id, org_id, project_id, issue_group_id, target_type, requested_by, reviewed_by, status, justification, review_reason, scope_summary, snapshot, expires_at, requested_at, decided_at"
    )
    .single();

  if (insertError || !inserted) {
    return serverError(insertError, "Create exception request");
  }

  const { error: eventError } = await supabase.from("exception_events").insert({
    exception_request_id: inserted.id,
    org_id: orgId,
    issue_group_id: group.id,
    actor_id: auth.user.id,
    event_type: "requested",
    payload: {
      justification,
      scope_summary: inserted.scope_summary,
      expires_at: inserted.expires_at,
    },
  });

  if (eventError) {
    return serverError(eventError, "Create exception event");
  }

  const { error: statusError } = await supabase
    .from("issue_groups")
    .update({ status: "pending_exception" })
    .eq("id", group.id);

  if (statusError) {
    return serverError(statusError, "Mark issue group as pending exception");
  }

  await logIssueGroupActivity(supabase, {
    orgId,
    userId: auth.user.id,
    issueGroupId: group.id,
    activityType: "status_change",
    metadata: {
      action: "exception_requested",
      exception_request_id: inserted.id,
      status: "pending_exception",
      rule_id: group.rule_id,
      severity: group.severity,
    },
  });

  return NextResponse.json({ success: true, request: inserted }, { status: 201 });
}
