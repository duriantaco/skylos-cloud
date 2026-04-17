import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadExceptionRequests,
  type EnrichedExceptionRequest,
} from "@/lib/exception-requests";
import {
  getExceptionStatusLabel,
  type ExceptionRequestStatus,
} from "@/lib/exception-governance";

type ProfileSummary = {
  id: string;
  email: string | null;
};

type ExceptionEventRow = {
  id: string;
  exception_request_id: string;
  actor_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type LinkedSuppressionRow = {
  exception_request_id: string | null;
  revoked_at: string | null;
  expires_at: string | null;
};

export type ExceptionEvidenceRow = {
  request_id: string;
  project_id: string;
  project_name: string;
  issue_group_id: string;
  rule_id: string;
  severity: string;
  canonical_file: string;
  canonical_line: number | null;
  issue_status: string;
  request_status: string;
  effective_status: ExceptionRequestStatus;
  requester_email: string;
  reviewer_email: string;
  justification: string;
  review_reason: string;
  requested_at: string;
  decided_at: string;
  expires_at: string;
  linked_suppressions: number;
  active_linked_suppressions: number;
  decision_trail: string;
};

export type ExceptionEvidenceSummary = {
  total: number;
  pending: number;
  active: number;
  expired: number;
  revoked: number;
  rejected: number;
  expiring_soon: number;
  active_with_expiry: number;
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function escapeCsv(value: unknown): string {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function eventReason(payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  return normalizeText(payload.review_reason) || normalizeText(payload.revoke_reason);
}

function eventSummary(
  event: ExceptionEventRow,
  actorEmails: Map<string, string | null>
): string {
  const actor = actorEmails.get(event.actor_id) || event.actor_id;
  const label =
    event.event_type === "requested"
      ? "Requested"
      : getExceptionStatusLabel(event.event_type as ExceptionRequestStatus);
  const reason = eventReason(event.payload);
  const suffix = reason ? ` (${reason})` : "";
  return `${label} by ${actor} at ${fmtDate(event.created_at)}${suffix}`;
}

export async function loadExceptionEvidenceRows(
  supabase: SupabaseClient,
  orgId: string,
  opts?: {
    requestId?: string;
    issueGroupId?: string;
    projectId?: string;
    status?: ExceptionRequestStatus;
    limit?: number;
  }
): Promise<ExceptionEvidenceRow[]> {
  const requests = await loadExceptionRequests(supabase, orgId, {
    requestId: opts?.requestId,
    issueGroupId: opts?.issueGroupId,
    status: opts?.status,
    limit: opts?.limit,
  });

  const filteredRequests = opts?.projectId
    ? requests.filter((request) => request.project_id === opts.projectId)
    : requests;

  if (filteredRequests.length === 0) {
    return [];
  }

  const requestIds = filteredRequests.map((request) => request.id);

  const [{ data: eventsData, error: eventsError }, { data: suppressionsData, error: suppressionsError }] =
    await Promise.all([
      supabase
        .from("exception_events")
        .select("id, exception_request_id, actor_id, event_type, payload, created_at")
        .in("exception_request_id", requestIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("finding_suppressions")
        .select("exception_request_id, revoked_at, expires_at")
        .in("exception_request_id", requestIds),
    ]);

  if (eventsError) throw eventsError;
  if (suppressionsError) throw suppressionsError;

  const events = (eventsData || []) as ExceptionEventRow[];
  const suppressions = (suppressionsData || []) as LinkedSuppressionRow[];
  const actorIds = Array.from(new Set(events.map((event) => event.actor_id).filter(Boolean)));

  let actorEmails = new Map<string, string | null>();
  if (actorIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", actorIds);

    if (profilesError) throw profilesError;

    actorEmails = new Map(
      ((profileRows || []) as ProfileSummary[]).map((row) => [row.id, row.email])
    );
  }

  const eventsByRequest = new Map<string, ExceptionEventRow[]>();
  for (const event of events) {
    const bucket = eventsByRequest.get(event.exception_request_id) || [];
    bucket.push(event);
    eventsByRequest.set(event.exception_request_id, bucket);
  }

  const suppressionsByRequest = new Map<string, LinkedSuppressionRow[]>();
  for (const row of suppressions) {
    if (!row.exception_request_id) continue;
    const bucket = suppressionsByRequest.get(row.exception_request_id) || [];
    bucket.push(row);
    suppressionsByRequest.set(row.exception_request_id, bucket);
  }

  const now = Date.now();

  return filteredRequests.map((request) => {
    const requestEvents = eventsByRequest.get(request.id) || [];
    const requestSuppressions = suppressionsByRequest.get(request.id) || [];
    const activeLinkedSuppressions = requestSuppressions.filter((row) => {
      if (row.revoked_at) return false;
      if (!row.expires_at) return true;
      const timestamp = new Date(row.expires_at).getTime();
      return Number.isFinite(timestamp) && timestamp > now;
    }).length;

    return {
      request_id: request.id,
      project_id: request.project_id,
      project_name: request.project?.name || "Unknown project",
      issue_group_id: request.issue_group_id,
      rule_id: request.issue_group?.rule_id || "Unknown rule",
      severity: request.issue_group?.severity || "unknown",
      canonical_file: request.issue_group?.canonical_file || "",
      canonical_line: request.issue_group?.canonical_line ?? null,
      issue_status: request.issue_group?.status || "open",
      request_status: request.status,
      effective_status: request.effective_status,
      requester_email: request.requester_email || request.requested_by,
      reviewer_email: request.reviewer_email || request.reviewed_by || "",
      justification: request.justification,
      review_reason: request.review_reason || "",
      requested_at: fmtDate(request.requested_at),
      decided_at: fmtDate(request.decided_at),
      expires_at: fmtDate(request.expires_at),
      linked_suppressions: requestSuppressions.length,
      active_linked_suppressions: activeLinkedSuppressions,
      decision_trail: requestEvents
        .map((event) => eventSummary(event, actorEmails))
        .join(" | "),
    };
  });
}

export function buildExceptionEvidenceSummary(
  requests: EnrichedExceptionRequest[],
  now = Date.now()
): ExceptionEvidenceSummary {
  let pending = 0;
  let active = 0;
  let expired = 0;
  let revoked = 0;
  let rejected = 0;
  let expiringSoon = 0;
  let activeWithExpiry = 0;

  for (const request of requests) {
    switch (request.effective_status) {
      case "requested":
        pending += 1;
        break;
      case "approved":
        active += 1;
        if (request.expires_at) {
          activeWithExpiry += 1;
          const timestamp = new Date(request.expires_at).getTime();
          if (Number.isFinite(timestamp) && timestamp > now && timestamp <= now + 14 * 24 * 60 * 60 * 1000) {
            expiringSoon += 1;
          }
        }
        break;
      case "expired":
        expired += 1;
        break;
      case "revoked":
        revoked += 1;
        break;
      case "rejected":
        rejected += 1;
        break;
    }
  }

  return {
    total: requests.length,
    pending,
    active,
    expired,
    revoked,
    rejected,
    expiring_soon: expiringSoon,
    active_with_expiry: activeWithExpiry,
  };
}

export function generateExceptionEvidenceCsv(rows: ExceptionEvidenceRow[]): string {
  const headers = [
    "request_id",
    "project_id",
    "project_name",
    "issue_group_id",
    "rule_id",
    "severity",
    "canonical_file",
    "canonical_line",
    "issue_status",
    "request_status",
    "effective_status",
    "requester_email",
    "reviewer_email",
    "justification",
    "review_reason",
    "requested_at",
    "decided_at",
    "expires_at",
    "linked_suppressions",
    "active_linked_suppressions",
    "decision_trail",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((header) => escapeCsv(row[header as keyof ExceptionEvidenceRow]))
        .join(",")
    );
  }
  return lines.join("\n");
}
