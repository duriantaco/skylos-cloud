import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import {
  logIssueGroupActivity,
  revokeExceptionRequest,
} from "@/lib/exception-governance";

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
    .select("id, org_id, issue_group_id")
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

  const result = await revokeExceptionRequest(supabase, {
    requestId: requestRow.id,
    reviewerId: auth.user.id,
    revokeReason,
  });

  if (!result.ok) {
    if (result.error_code === "not_found") {
      return NextResponse.json({ error: "Exception request not found." }, { status: 404 });
    }
    if (result.error_code === "expired") {
      return NextResponse.json(
        { error: "This exception already expired and can no longer be revoked." },
        { status: 409 }
      );
    }
    if (result.error_code === "invalid_state") {
      return NextResponse.json(
        { error: "Only active approved exceptions can be revoked." },
        { status: 409 }
      );
    }
    if (result.error_code === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return serverError(new Error("Unexpected exception revoke response"), "Revoke exception");
  }

  const nextIssueStatus = result.issue_group_status ?? "open";

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
