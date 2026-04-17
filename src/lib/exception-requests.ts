import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExceptionRequestStatus } from "@/lib/exception-governance";

export type ExceptionRequestRecord = {
  id: string;
  org_id: string;
  project_id: string;
  issue_group_id: string;
  target_type: "issue_group";
  requested_by: string;
  reviewed_by: string | null;
  status: ExceptionRequestStatus;
  justification: string;
  review_reason: string | null;
  scope_summary: string | null;
  snapshot: Record<string, unknown> | null;
  requested_at: string;
  decided_at: string | null;
};

export type ExceptionEventRecord = {
  id: string;
  exception_request_id: string;
  org_id: string;
  issue_group_id: string;
  actor_id: string;
  event_type: ExceptionRequestStatus | "requested";
  payload: Record<string, unknown> | null;
  created_at: string;
};

type IssueGroupSummary = {
  id: string;
  rule_id: string | null;
  severity: string | null;
  canonical_file: string | null;
  canonical_line: number | null;
  status: string | null;
};

type ProjectSummary = {
  id: string;
  name: string | null;
};

type ProfileSummary = {
  id: string;
  email: string | null;
};

export type EnrichedExceptionRequest = ExceptionRequestRecord & {
  issue_group: IssueGroupSummary | null;
  project: ProjectSummary | null;
  requester_email: string | null;
  reviewer_email: string | null;
};

export async function loadExceptionRequests(
  supabase: SupabaseClient,
  orgId: string,
  opts?: {
    requestId?: string;
    status?: ExceptionRequestStatus;
    issueGroupId?: string;
    limit?: number;
  }
): Promise<EnrichedExceptionRequest[]> {
  let query = supabase
    .from("policy_exception_requests")
    .select(
      "id, org_id, project_id, issue_group_id, target_type, requested_by, reviewed_by, status, justification, review_reason, scope_summary, snapshot, requested_at, decided_at"
    )
    .eq("org_id", orgId)
    .order("requested_at", { ascending: false });

  if (opts?.requestId) query = query.eq("id", opts.requestId);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.issueGroupId) query = query.eq("issue_group_id", opts.issueGroupId);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data || []) as ExceptionRequestRecord[];
  if (requests.length === 0) return [];

  const [issueGroupsRes, projectsRes, profilesRes] = await Promise.all([
    supabase
      .from("issue_groups")
      .select("id, rule_id, severity, canonical_file, canonical_line, status")
      .in(
        "id",
        Array.from(new Set(requests.map((r) => r.issue_group_id)))
      ),
    supabase
      .from("projects")
      .select("id, name")
      .in(
        "id",
        Array.from(new Set(requests.map((r) => r.project_id)))
      ),
    supabase
      .from("profiles")
      .select("id, email")
      .in(
        "id",
        Array.from(
          new Set(
            requests.flatMap((r) =>
              [r.requested_by, r.reviewed_by].filter(Boolean) as string[]
            )
          )
        )
      ),
  ]);

  if (issueGroupsRes.error) throw issueGroupsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const issueGroups = new Map(
    ((issueGroupsRes.data || []) as IssueGroupSummary[]).map((row) => [row.id, row])
  );
  const projects = new Map(
    ((projectsRes.data || []) as ProjectSummary[]).map((row) => [row.id, row])
  );
  const profiles = new Map(
    ((profilesRes.data || []) as ProfileSummary[]).map((row) => [row.id, row])
  );

  return requests.map((request) => ({
    ...request,
    issue_group: issueGroups.get(request.issue_group_id) || null,
    project: projects.get(request.project_id) || null,
    requester_email: profiles.get(request.requested_by)?.email || null,
    reviewer_email: request.reviewed_by
      ? profiles.get(request.reviewed_by)?.email || null
      : null,
  }));
}

export async function loadExceptionRequestDetail(
  supabase: SupabaseClient,
  orgId: string,
  requestId: string
): Promise<{
  request: EnrichedExceptionRequest | null;
  events: Array<
    ExceptionEventRecord & {
      actor_email: string | null;
    }
  >;
}> {
  const [request] = await loadExceptionRequests(supabase, orgId, {
    requestId,
    limit: 1,
  });

  if (!request) {
    return { request: null, events: [] };
  }

  const { data, error } = await supabase
    .from("exception_events")
    .select(
      "id, exception_request_id, org_id, issue_group_id, actor_id, event_type, payload, created_at"
    )
    .eq("org_id", orgId)
    .eq("exception_request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const events = (data || []) as ExceptionEventRecord[];
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

  return {
    request,
    events: events.map((event) => ({
      ...event,
      actor_email: actorEmails.get(event.actor_id) || null,
    })),
  };
}
