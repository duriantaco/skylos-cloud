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
import { buildActiveSuppressionKeys, buildSuppressionKey } from "@/lib/report-suppressions-core";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const revokeReason =
    typeof body.revoke_reason === "string" ? body.revoke_reason.trim() : null;

  const { data: requestRow, error: requestError } = await supabase
    .from("policy_exception_requests")
    .select("id, org_id, project_id, issue_group_id, requested_by, status, justification, expires_at")
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

  if (getEffectiveExceptionStatus(requestRow.status, requestRow.expires_at) !== "approved") {
    return NextResponse.json(
      { error: "Only active approved exceptions can be revoked." },
      { status: 409 }
    );
  }

  const revokedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("policy_exception_requests")
    .update({ status: "revoked" })
    .eq("id", requestRow.id)
    .eq("status", "approved");

  if (updateError) {
    return serverError(updateError, "Update exception request");
  }

  const { error: eventError } = await supabase.from("exception_events").insert({
    exception_request_id: requestRow.id,
    org_id: requestRow.org_id,
    issue_group_id: requestRow.issue_group_id,
    actor_id: auth.user.id,
    event_type: "revoked",
    payload: {
      revoke_reason: revokeReason,
    },
  });

  if (eventError) {
    return serverError(eventError, "Create exception revoke event");
  }

  const { error: revokeSuppressionsError } = await supabase
    .from("finding_suppressions")
    .update({
      revoked_at: revokedAt,
      revoked_by: auth.user.id,
    })
    .eq("exception_request_id", requestRow.id)
    .is("revoked_at", null);

  if (revokeSuppressionsError) {
    return serverError(revokeSuppressionsError, "Revoke exception suppressions");
  }

  const { data: findings, error: findingsError } = await supabase
    .from("findings")
    .select("id, rule_id, file_path, line_number")
    .eq("group_id", requestRow.issue_group_id)
    .limit(5000);

  if (findingsError) {
    return serverError(findingsError, "Load issue-group findings");
  }

  const { data: suppressions, error: suppressionsError } = await supabase
    .from("finding_suppressions")
    .select("rule_id, file_path, line_number, expires_at")
    .eq("project_id", requestRow.project_id)
    .is("revoked_at", null);

  if (suppressionsError) {
    return serverError(suppressionsError, "Load active suppressions");
  }

  const activeSuppressions = buildActiveSuppressionKeys(
    (suppressions || []).map((row) => ({
      rule_id: row.rule_id,
      file_path: row.file_path,
      line_number: row.line_number,
      expires_at: row.expires_at,
    })),
    revokedAt,
    (filePath) => filePath
  );

  const activeFindingIds =
    (findings || [])
      .filter((finding) =>
        activeSuppressions.has(
          buildSuppressionKey(
            String(finding.rule_id || "UNKNOWN"),
            String(finding.file_path || ""),
            Number(finding.line_number || 0)
          )
        )
      )
      .map((finding) => finding.id) || [];

  const allFindingIds = (findings || []).map((finding) => finding.id);
  if (allFindingIds.length > 0) {
    const { error: clearError } = await supabase
      .from("findings")
      .update({ is_suppressed: false })
      .in("id", allFindingIds);

    if (clearError) {
      return serverError(clearError, "Clear issue-group finding suppressions");
    }
  }

  if (activeFindingIds.length > 0) {
    const { error: reapplyError } = await supabase
      .from("findings")
      .update({ is_suppressed: true })
      .in("id", activeFindingIds);

    if (reapplyError) {
      return serverError(reapplyError, "Reapply remaining suppressions");
    }
  }

  const { data: pendingRequest } = await supabase
    .from("policy_exception_requests")
    .select("id")
    .eq("issue_group_id", requestRow.issue_group_id)
    .eq("status", "requested")
    .maybeSingle();

  const nextIssueStatus = pendingRequest
    ? "pending_exception"
    : activeFindingIds.length > 0
    ? "suppressed"
    : "open";

  const { error: issueStatusError } = await supabase
    .from("issue_groups")
    .update({ status: nextIssueStatus })
    .eq("id", requestRow.issue_group_id);

  if (issueStatusError) {
    return serverError(issueStatusError, "Update issue group status after revoke");
  }

  await logIssueGroupActivity(supabase, {
    orgId: requestRow.org_id,
    userId: auth.user.id,
    issueGroupId: requestRow.issue_group_id,
    activityType: "suppression",
    metadata: {
      action: "exception_revoked",
      exception_request_id: requestRow.id,
      status: nextIssueStatus,
      revoke_reason: revokeReason,
    },
  });

  return NextResponse.json({ success: true, status: "revoked" });
}
