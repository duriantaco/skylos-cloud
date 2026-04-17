import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import { logIssueGroupActivity } from "@/lib/exception-governance";

type Decision = "approve" | "reject";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const decision = body.decision as Decision;
  const reviewReason =
    typeof body.review_reason === "string" ? body.review_reason.trim() : null;

  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("policy_exception_requests")
    .select(
      "id, org_id, project_id, issue_group_id, requested_by, status, justification, snapshot, expires_at"
    )
    .eq("id", id)
    .single();

  if (requestError || !requestRow) {
    return NextResponse.json({ error: "Exception request not found." }, { status: 404 });
  }

  const auth = await requirePermission(supabase, "review:exceptions", requestRow.org_id);
  if (isAuthError(auth)) return auth;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan, pro_expires_at")
    .eq("id", requestRow.org_id)
    .single();
  const effectivePlan = getEffectivePlan({
    plan: org?.plan || "free",
    pro_expires_at: org?.pro_expires_at,
  });
  const planCheck = requirePlan(effectivePlan, "pro", "Exception Governance");
  if (!planCheck.ok) return planCheck.response;

  if (requestRow.requested_by === auth.user.id) {
    return NextResponse.json(
      { error: "Requesters cannot approve or reject their own exception requests." },
      { status: 403 }
    );
  }

  if (requestRow.status !== "requested") {
    return NextResponse.json(
      { error: "Only pending exception requests can be reviewed." },
      { status: 409 }
    );
  }

  if (
    decision === "approve" &&
    requestRow.expires_at &&
    new Date(requestRow.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "This exception request already passed its expiry and can no longer be approved." },
      { status: 409 }
    );
  }

  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const decidedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("policy_exception_requests")
    .update({
      status: nextStatus,
      reviewed_by: auth.user.id,
      review_reason: reviewReason,
      decided_at: decidedAt,
    })
    .eq("id", requestRow.id)
    .eq("status", "requested");

  if (updateError) {
    return serverError(updateError, "Update exception request");
  }

  const { error: eventError } = await supabase.from("exception_events").insert({
    exception_request_id: requestRow.id,
    org_id: requestRow.org_id,
    issue_group_id: requestRow.issue_group_id,
    actor_id: auth.user.id,
    event_type: nextStatus,
    payload: {
      review_reason: reviewReason,
      expires_at: requestRow.expires_at,
    },
  });

  if (eventError) {
    return serverError(eventError, "Create exception decision event");
  }

  if (decision === "approve") {
    const { data: findings, error: findingsError } = await supabase
      .from("findings")
      .select("id, rule_id, file_path, line_number")
      .eq("group_id", requestRow.issue_group_id)
      .limit(5000);

    if (findingsError) {
      return serverError(findingsError, "Load findings for suppression materialization");
    }

    const suppressionRows =
      (findings || []).map((finding) => ({
        project_id: requestRow.project_id,
        rule_id: finding.rule_id,
        file_path: finding.file_path,
        line_number: Number(finding.line_number || 0),
        exception_request_id: requestRow.id,
        reason: requestRow.justification,
        created_by: requestRow.requested_by,
        expires_at: requestRow.expires_at,
      })) || [];

    if (suppressionRows.length > 0) {
      const { error: suppressionsError } = await supabase
        .from("finding_suppressions")
        .upsert(suppressionRows, { onConflict: "project_id,rule_id,line_number,file_path" });

      if (suppressionsError) {
        return serverError(suppressionsError, "Materialize approved suppressions");
      }

      const findingIds = findings!.map((finding) => finding.id);
      const { error: updateFindingsError } = await supabase
        .from("findings")
        .update({ is_suppressed: true })
        .in("id", findingIds);

      if (updateFindingsError) {
        return serverError(updateFindingsError, "Mark findings as suppressed");
      }
    }

    const { error: issueStatusError } = await supabase
      .from("issue_groups")
      .update({ status: "suppressed" })
      .eq("id", requestRow.issue_group_id);

    if (issueStatusError) {
      return serverError(issueStatusError, "Update issue group status to suppressed");
    }

    await logIssueGroupActivity(supabase, {
      orgId: requestRow.org_id,
      userId: auth.user.id,
      issueGroupId: requestRow.issue_group_id,
      activityType: "suppression",
      metadata: {
        action: "exception_approved",
        exception_request_id: requestRow.id,
        status: "suppressed",
        review_reason: reviewReason,
      },
    });
  } else {
    const { error: issueStatusError } = await supabase
      .from("issue_groups")
      .update({ status: "open" })
      .eq("id", requestRow.issue_group_id);

    if (issueStatusError) {
      return serverError(issueStatusError, "Update issue group status to open");
    }

    await logIssueGroupActivity(supabase, {
      orgId: requestRow.org_id,
      userId: auth.user.id,
      issueGroupId: requestRow.issue_group_id,
      activityType: "status_change",
      metadata: {
        action: "exception_rejected",
        exception_request_id: requestRow.id,
        status: "open",
        review_reason: reviewReason,
      },
    });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
