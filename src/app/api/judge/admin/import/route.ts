import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { normalizeIncomingReport } from "@/lib/report-normalization";
import {
  JudgeAnalysisKind,
  computeJudgeSnapshot,
  JUDGE_SCORING_VERSION,
  normalizeJudgeRepoIdentity,
} from "@/lib/judge-core";
import { requireJudgeAdmin } from "../_shared";

type ImportBody = {
  repo?: {
    host?: string | null;
    owner?: string | null;
    name?: string | null;
    source_url?: string | null;
    default_branch?: string | null;
    language?: string | null;
  };
  snapshot?: {
    branch?: string | null;
    commit_sha?: string | null;
    scanned_at?: string | null;
    skylos_version?: string | null;
    scoring_version?: string | null;
    confidence_score?: number | null;
    fairness_notes?: string[] | null;
    ingest_source?: string | null;
    analysis_mode?: string | null;
    analysis_kind?: JudgeAnalysisKind | null;
    job_id?: string | null;
  };
  report?: unknown;
};

export async function POST(request: Request) {
  const authError = requireJudgeAdmin(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as ImportBody | null;
  if (!body?.repo || !body?.snapshot?.commit_sha || !body.report) {
    return NextResponse.json(
      { error: "repo, snapshot.commit_sha, and report are required" },
      { status: 400 }
    );
  }

  const repoIdentity = normalizeJudgeRepoIdentity({
    host: body.repo.host,
    owner: body.repo.owner || "",
    name: body.repo.name || "",
    sourceUrl: body.repo.source_url,
  });

  const normalized = normalizeIncomingReport(body.report);
  const analysisKind: JudgeAnalysisKind =
    body.snapshot.analysis_kind === "agent" ? "agent" : "static";
  const scoringVersion =
    typeof body.snapshot.scoring_version === "string" &&
    body.snapshot.scoring_version.trim().length > 0
      ? body.snapshot.scoring_version.trim()
      : JUDGE_SCORING_VERSION;

  const computed = computeJudgeSnapshot({
    normalizedPayload: {
      summary: normalized.summary,
      findings: normalized.findings,
    },
    confidenceScore: body.snapshot.confidence_score ?? 100,
    fairnessNotes: body.snapshot.fairness_notes || [],
    analysisMode: body.snapshot.analysis_mode || null,
    tool: normalized.tool,
    source: normalized.source,
  });

  const scannedAt =
    typeof body.snapshot.scanned_at === "string" && body.snapshot.scanned_at.trim().length > 0
      ? body.snapshot.scanned_at
      : new Date().toISOString();

  const { data: repoRow, error: repoError } = await supabaseAdmin
    .from("judge_repos")
    .upsert(
      {
        host: repoIdentity.host,
        owner: repoIdentity.owner,
        name: repoIdentity.name,
        source_url: repoIdentity.sourceUrl,
        default_branch: body.repo.default_branch || body.snapshot.branch || normalized.branch || null,
        language: body.repo.language || null,
        last_scanned_at: scannedAt,
      },
      { onConflict: "host,owner,name" }
    )
    .select("id, host, owner, name")
    .single();

  if (repoError || !repoRow) {
    return NextResponse.json(
      { error: repoError?.message || "Failed to upsert judge repo" },
      { status: 500 }
    );
  }

  const { data: snapshotRow, error: snapshotError } = await supabaseAdmin
    .from("judge_repo_snapshots")
    .upsert(
      {
        repo_id: repoRow.id,
        analysis_kind: analysisKind,
        commit_sha: body.snapshot.commit_sha,
        branch: body.snapshot.branch || normalized.branch || null,
        scanned_at: scannedAt,
        ingest_source: body.snapshot.ingest_source || "admin-import",
        status: "ready",
        skylos_version: body.snapshot.skylos_version || null,
        scoring_version: scoringVersion,
        analysis_mode: body.snapshot.analysis_mode || null,
        overall_score: computed.overallScore,
        grade: computed.grade,
        security_score: computed.securityScore,
        quality_score: computed.qualityScore,
        dead_code_score: computed.deadCodeScore,
        confidence_score: computed.confidenceScore,
        summary: computed.summary,
        top_findings: computed.topFindings,
        fairness_notes: computed.fairnessNotes,
        result: body.report,
      },
      { onConflict: "repo_id,commit_sha,scoring_version,analysis_kind" }
    )
    .select("id, overall_score, grade")
    .single();

  if (snapshotError || !snapshotRow) {
    return NextResponse.json(
      { error: snapshotError?.message || "Failed to store judge snapshot" },
      { status: 500 }
    );
  }

  if (body.snapshot.job_id) {
    const { data: existingJob } = await supabaseAdmin
      .from("judge_jobs")
      .select("requested_analysis_modes, static_status, agent_status")
      .eq("id", body.snapshot.job_id)
      .maybeSingle();

    const requestedModes = Array.isArray(existingJob?.requested_analysis_modes)
      ? existingJob.requested_analysis_modes
      : ["static"];
    const staticStatus = analysisKind === "static" ? "succeeded" : existingJob?.static_status;
    const agentStatus = analysisKind === "agent" ? "succeeded" : existingJob?.agent_status;
    const allRequestedDone =
      (!requestedModes.includes("static") || staticStatus === "succeeded") &&
      (!requestedModes.includes("agent") || agentStatus === "succeeded");

    const jobUpdate =
      analysisKind === "agent"
        ? {
            agent_status: "succeeded",
            agent_snapshot_id: snapshotRow.id,
          }
        : {
            static_status: "succeeded",
            static_snapshot_id: snapshotRow.id,
          };

    await supabaseAdmin
      .from("judge_jobs")
      .update({
        status: allRequestedDone ? "succeeded" : "running",
        finished_at: allRequestedDone ? new Date().toISOString() : null,
        error: null,
        ...jobUpdate,
      })
      .eq("id", body.snapshot.job_id);
  }

  return NextResponse.json({
    success: true,
    repo: repoIdentity.fullName,
    snapshot_id: snapshotRow.id,
    overall_score: snapshotRow.overall_score,
    grade: snapshotRow.grade,
  });
}
