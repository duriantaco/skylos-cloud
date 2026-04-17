import type { SupabaseClient } from "@supabase/supabase-js";

export type ExceptionRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "revoked"
  | "expired";

export function isExceptionExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

export function getEffectiveExceptionStatus(
  status: ExceptionRequestStatus,
  expiresAt: string | null | undefined
): ExceptionRequestStatus {
  if (status === "approved" && isExceptionExpired(expiresAt)) {
    return "expired";
  }
  return status;
}

export function isGovernedPlan(plan: string): boolean {
  return plan === "pro" || plan === "enterprise";
}

export function getIssueGroupStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending_exception":
      return "Pending exception";
    case "suppressed":
      return "Suppressed";
    case "resolved":
      return "Resolved";
    default:
      return "Open";
  }
}

export function getExceptionStatusLabel(status: ExceptionRequestStatus): string {
  switch (status) {
    case "requested":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export type ExceptionMutationResult = {
  ok: boolean;
  status?: ExceptionRequestStatus;
  issue_group_status?: string | null;
  error_code?: string | null;
  expired_count?: number;
};

function toExceptionMutationResult(value: unknown): ExceptionMutationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error_code: "invalid_response" };
  }

  const record = value as Record<string, unknown>;
  return {
    ok: record.ok === true,
    status:
      typeof record.status === "string"
        ? (record.status as ExceptionRequestStatus)
        : undefined,
    issue_group_status:
      typeof record.issue_group_status === "string" ? record.issue_group_status : null,
    error_code: typeof record.error_code === "string" ? record.error_code : null,
    expired_count:
      typeof record.expired_count === "number" ? record.expired_count : undefined,
  };
}

export async function reviewExceptionRequest(
  supabase: SupabaseClient,
  opts: {
    requestId: string;
    reviewerId: string;
    decision: "approve" | "reject";
    reviewReason?: string | null;
  }
): Promise<ExceptionMutationResult> {
  const { data, error } = await supabase.rpc("review_exception_request", {
    p_request_id: opts.requestId,
    p_reviewer_id: opts.reviewerId,
    p_decision: opts.decision,
    p_review_reason: opts.reviewReason ?? null,
  });

  if (error) throw error;
  return toExceptionMutationResult(data);
}

export async function revokeExceptionRequest(
  supabase: SupabaseClient,
  opts: {
    requestId: string;
    reviewerId: string;
    revokeReason?: string | null;
  }
): Promise<ExceptionMutationResult> {
  const { data, error } = await supabase.rpc("revoke_exception_request", {
    p_request_id: opts.requestId,
    p_reviewer_id: opts.reviewerId,
    p_revoke_reason: opts.revokeReason ?? null,
  });

  if (error) throw error;
  return toExceptionMutationResult(data);
}

export async function syncExpiredExceptionRequests(
  supabase: SupabaseClient,
  opts: {
    orgId?: string | null;
    requestId?: string | null;
    issueGroupId?: string | null;
  }
): Promise<ExceptionMutationResult> {
  const { data, error } = await supabase.rpc("sync_expired_exception_requests", {
    p_org_id: opts.orgId ?? null,
    p_request_id: opts.requestId ?? null,
    p_issue_group_id: opts.issueGroupId ?? null,
  });

  if (error) throw error;
  return toExceptionMutationResult(data);
}

export async function logIssueGroupActivity(
  supabase: SupabaseClient,
  opts: {
    orgId: string;
    userId: string;
    issueGroupId: string;
    activityType: "status_change" | "suppression";
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.rpc("log_team_activity", {
    p_org_id: opts.orgId,
    p_user_id: opts.userId,
    p_activity_type: opts.activityType,
    p_entity_type: "issue_group",
    p_entity_id: opts.issueGroupId,
    p_metadata: opts.metadata,
  });

  if (error) {
    console.error("Failed to log issue group activity:", error);
  }
}
