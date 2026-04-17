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
