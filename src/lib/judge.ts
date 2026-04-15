import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/utils/supabase/admin";
import type {
  JudgeAnalysisKind,
  JudgeAnalysisStatus,
  JudgeFindingPreview,
} from "@/lib/judge-core";
import { hasPublishedJudgeScorecard } from "@/lib/judge-public";

type JudgeRepoRow = {
  id: string;
  host: string;
  owner: string;
  name: string;
  source_url: string;
  default_branch: string | null;
  language: string | null;
  last_scanned_at: string | null;
};

type JudgeSnapshotRow = {
  id: string;
  repo_id: string;
  analysis_kind: JudgeAnalysisKind;
  commit_sha: string;
  branch: string | null;
  scanned_at: string;
  status: "ready" | "unsupported";
  skylos_version: string | null;
  scoring_version: string;
  analysis_mode: string | null;
  overall_score: number;
  grade: string;
  security_score: number;
  quality_score: number;
  dead_code_score: number;
  confidence_score: number;
  summary: Record<string, unknown> | null;
  top_findings: JudgeFindingPreview[] | null;
  fairness_notes: string[] | null;
};

type JudgeJobRow = {
  id: string;
  repo_id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  requested_analysis_modes: JudgeAnalysisKind[] | null;
  static_status: JudgeAnalysisStatus;
  agent_status: JudgeAnalysisStatus;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  target_ref: string | null;
};

export type JudgeRepoSummary = {
  repo: JudgeRepoRow;
  latestSnapshot: JudgeSnapshotRow | null;
  latestAgentSnapshot: JudgeSnapshotRow | null;
  activeJob: JudgeJobRow | null;
};

export type JudgeRepoDetail = {
  repo: JudgeRepoRow;
  latestSnapshot: JudgeSnapshotRow | null;
  latestAgentSnapshot: JudgeSnapshotRow | null;
  history: JudgeSnapshotRow[];
  activeJob: JudgeJobRow | null;
};

export type JudgeRepoSitemapEntry = {
  owner: string;
  name: string;
  lastScannedAt: string | null;
};

export type JudgeSuggestionRow = {
  id: string;
  host: string;
  owner: string;
  name: string;
  source_url: string;
  contact_email: string | null;
  notes: string | null;
  requested_analysis_modes: JudgeAnalysisKind[];
  status: "pending" | "approved" | "queued" | "rejected" | "duplicate";
  created_at: string;
  review_notes: string | null;
};

function hasJudgeAdminAccess(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isJudgeSchemaMissing(message: string | undefined): boolean {
  return typeof message === "string" && message.includes("judge_repos");
}

function firstByRepoId<T extends { repo_id: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();

  for (const row of rows) {
    if (!map.has(row.repo_id)) {
      map.set(row.repo_id, row);
    }
  }

  return map;
}

export async function getJudgeRepoIndex(): Promise<JudgeRepoSummary[]> {
  if (!hasJudgeAdminAccess()) {
    return [];
  }

  const { data: repos, error: repoError } = await supabaseAdmin
    .from("judge_repos")
    .select("id, host, owner, name, source_url, default_branch, language, last_scanned_at")
    .eq("is_active", true)
    .order("last_scanned_at", { ascending: false, nullsFirst: false })
    .order("owner", { ascending: true })
    .order("name", { ascending: true });

  if (repoError) {
    if (isJudgeSchemaMissing(repoError.message)) {
      return [];
    }
    throw new Error(`Failed to load judge repos: ${repoError.message}`);
  }

  const repoRows = (repos || []) as JudgeRepoRow[];
  if (repoRows.length === 0) {
    return [];
  }

  const repoIds = repoRows.map((repo) => repo.id);

  const [
    { data: snapshots, error: snapshotError },
    { data: agentSnapshots, error: agentSnapshotError },
    { data: jobs, error: jobError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("judge_repo_snapshots")
        .select(
          "id, repo_id, analysis_kind, commit_sha, branch, scanned_at, status, skylos_version, scoring_version, analysis_mode, overall_score, grade, security_score, quality_score, dead_code_score, confidence_score, summary, top_findings, fairness_notes"
        )
        .in("repo_id", repoIds)
        .eq("analysis_kind", "static")
        .order("scanned_at", { ascending: false }),
      supabaseAdmin
        .from("judge_repo_snapshots")
        .select(
          "id, repo_id, analysis_kind, commit_sha, branch, scanned_at, status, skylos_version, scoring_version, analysis_mode, overall_score, grade, security_score, quality_score, dead_code_score, confidence_score, summary, top_findings, fairness_notes"
        )
        .in("repo_id", repoIds)
        .eq("analysis_kind", "agent")
        .order("scanned_at", { ascending: false }),
      supabaseAdmin
        .from("judge_jobs")
        .select("id, repo_id, status, requested_analysis_modes, static_status, agent_status, requested_at, started_at, finished_at, error, target_ref")
        .in("repo_id", repoIds)
        .in("status", ["pending", "running"])
        .order("requested_at", { ascending: false }),
    ]);

  if (snapshotError) {
    throw new Error(`Failed to load judge snapshots: ${snapshotError.message}`);
  }

  if (agentSnapshotError) {
    throw new Error(
      `Failed to load judge agent snapshots: ${agentSnapshotError.message}`
    );
  }

  if (jobError) {
    throw new Error(`Failed to load judge jobs: ${jobError.message}`);
  }

  const snapshotMap = firstByRepoId((snapshots || []) as JudgeSnapshotRow[]);
  const agentSnapshotMap = firstByRepoId((agentSnapshots || []) as JudgeSnapshotRow[]);
  const jobMap = firstByRepoId((jobs || []) as JudgeJobRow[]);

  return repoRows
    .map((repo) => ({
      repo,
      latestSnapshot: snapshotMap.get(repo.id) || null,
      latestAgentSnapshot: agentSnapshotMap.get(repo.id) || null,
      activeJob: jobMap.get(repo.id) || null,
    }))
    .filter(({ latestSnapshot }) => hasPublishedJudgeScorecard(latestSnapshot));
}

export async function getJudgeRepoSitemapEntries(): Promise<JudgeRepoSitemapEntry[]> {
  const summaries = await getJudgeRepoIndex();

  return summaries.map(({ repo, latestSnapshot }) => ({
    owner: repo.owner,
    name: repo.name,
    lastScannedAt: latestSnapshot?.scanned_at || repo.last_scanned_at,
  }));
}

export async function getJudgeRepoDetail(
  owner: string,
  name: string
): Promise<JudgeRepoDetail> {
  if (!hasJudgeAdminAccess()) {
    notFound();
  }

  const { data: repo, error: repoError } = await supabaseAdmin
    .from("judge_repos")
    .select("id, host, owner, name, source_url, default_branch, language, last_scanned_at")
    .eq("host", "github")
    .eq("owner", owner.toLowerCase())
    .eq("name", name.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (repoError) {
    if (isJudgeSchemaMissing(repoError.message)) {
      notFound();
    }
    throw new Error(`Failed to load judge repo detail: ${repoError.message}`);
  }

  if (!repo) {
    notFound();
  }

  const [
    { data: snapshots, error: snapshotError },
    { data: agentSnapshots, error: agentSnapshotError },
    { data: jobs, error: jobError },
  ] =
    await Promise.all([
      supabaseAdmin
        .from("judge_repo_snapshots")
        .select(
          "id, repo_id, analysis_kind, commit_sha, branch, scanned_at, status, skylos_version, scoring_version, analysis_mode, overall_score, grade, security_score, quality_score, dead_code_score, confidence_score, summary, top_findings, fairness_notes"
        )
        .eq("repo_id", repo.id)
        .eq("analysis_kind", "static")
        .order("scanned_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("judge_repo_snapshots")
        .select(
          "id, repo_id, analysis_kind, commit_sha, branch, scanned_at, status, skylos_version, scoring_version, analysis_mode, overall_score, grade, security_score, quality_score, dead_code_score, confidence_score, summary, top_findings, fairness_notes"
        )
        .eq("repo_id", repo.id)
        .eq("analysis_kind", "agent")
        .order("scanned_at", { ascending: false })
        .limit(1),
      supabaseAdmin
        .from("judge_jobs")
        .select("id, repo_id, status, requested_analysis_modes, static_status, agent_status, requested_at, started_at, finished_at, error, target_ref")
        .eq("repo_id", repo.id)
        .in("status", ["pending", "running"])
        .order("requested_at", { ascending: false })
        .limit(1),
    ]);

  if (snapshotError) {
    throw new Error(`Failed to load judge repo snapshots: ${snapshotError.message}`);
  }

  if (agentSnapshotError) {
    throw new Error(
      `Failed to load judge repo agent snapshots: ${agentSnapshotError.message}`
    );
  }

  if (jobError) {
    throw new Error(`Failed to load judge repo jobs: ${jobError.message}`);
  }

  const history = ((snapshots || []) as JudgeSnapshotRow[]).filter((snapshot) =>
    hasPublishedJudgeScorecard(snapshot)
  );
  const latestAgentSnapshot =
    ((agentSnapshots || [])[0] as JudgeSnapshotRow | undefined) || null;

  return {
    repo: repo as JudgeRepoRow,
    latestSnapshot: history[0] || null,
    latestAgentSnapshot,
    history,
    activeJob: ((jobs || [])[0] as JudgeJobRow | undefined) || null,
  };
}

export async function getPendingJudgeSuggestions(): Promise<JudgeSuggestionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("judge_suggestions")
    .select(
      "id, host, owner, name, source_url, contact_email, notes, requested_analysis_modes, status, created_at, review_notes"
    )
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false });

  if (error) {
    if (typeof error.message === "string" && error.message.includes("judge_suggestions")) {
      return [];
    }
    throw new Error(`Failed to load judge suggestions: ${error.message}`);
  }

  return (data || []) as JudgeSuggestionRow[];
}
