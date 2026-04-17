import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { serverError } from "@/lib/api-error";
import { requirePermission, isAuthError } from "@/lib/permissions";
import { getEffectivePlan } from "@/lib/entitlements";
import { requirePlan } from "@/lib/require-credits";
import {
  logIssueGroupActivity,
  reviewExceptionRequest,
} from "@/lib/exception-governance";

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
      "id, org_id, issue_group_id, requested_by"
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

  const result = await reviewExceptionRequest(supabase, {
    requestId: requestRow.id,
    reviewerId: auth.user.id,
    decision,
    reviewReason,
  });

  if (!result.ok) {
    if (result.error_code === "not_found") {
      return NextResponse.json({ error: "Exception request not found." }, { status: 404 });
    }
    if (result.error_code === "self_review") {
      return NextResponse.json(
        { error: "Requesters cannot approve or reject their own exception requests." },
        { status: 403 }
      );
    }
    if (result.error_code === "expired") {
      return NextResponse.json(
        {
          error:
            "This exception request already passed its expiry and can no longer be reviewed.",
        },
        { status: 409 }
      );
    }
    if (result.error_code === "invalid_state") {
      return NextResponse.json(
        { error: "Only pending exception requests can be reviewed." },
        { status: 409 }
      );
    }
    if (result.error_code === "forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return serverError(new Error("Unexpected exception review response"), "Review exception");
  }

  const nextStatus = result.status ?? (decision === "approve" ? "approved" : "rejected");
  const nextIssueStatus =
    result.issue_group_status ?? (decision === "approve" ? "suppressed" : "open");

  await logIssueGroupActivity(supabase, {
    orgId: requestRow.org_id,
    userId: auth.user.id,
    issueGroupId: requestRow.issue_group_id,
    activityType: decision === "approve" ? "suppression" : "status_change",
    metadata: {
      action: decision === "approve" ? "exception_approved" : "exception_rejected",
      exception_request_id: requestRow.id,
      status: nextIssueStatus,
      review_reason: reviewReason,
    },
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
