import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { buildJudgeJobAnalysisState } from "@/lib/judge-core";
import { DEFAULT_JUDGE_SEED_REPOS } from "@/lib/judge-seeds";
import { requireJudgeAdmin } from "../_shared";

type RepoRow = {
  id: string;
  owner: string;
  name: string;
};

type RepoIdRow = {
  repo_id: string;
};

export async function POST(request: Request) {
  const authError = requireJudgeAdmin(request);
  if (authError) return authError;

  const { data: repoRows, error: repoError } = await supabaseAdmin
    .from("judge_repos")
    .upsert(
      DEFAULT_JUDGE_SEED_REPOS.map((repo) => ({
        host: repo.host,
        owner: repo.owner,
        name: repo.name,
        source_url: repo.sourceUrl,
        default_branch: repo.defaultBranch,
        language: repo.language,
        is_active: true,
      })),
      { onConflict: "host,owner,name" }
    )
    .select("id, owner, name");

  if (repoError) {
    return NextResponse.json(
      { error: `Failed to seed judge repos: ${repoError.message}` },
      { status: 500 }
    );
  }

  const repos = (repoRows || []) as RepoRow[];
  const repoIds = repos.map((repo) => repo.id);

  const [{ data: snapshots }, { data: activeJobs }] = await Promise.all([
    supabaseAdmin
      .from("judge_repo_snapshots")
      .select("repo_id")
      .in("repo_id", repoIds),
    supabaseAdmin
      .from("judge_jobs")
      .select("repo_id")
      .in("repo_id", repoIds)
      .in("status", ["pending", "running"]),
  ]);

  const reposWithSnapshots = new Set(
    ((snapshots || []) as RepoIdRow[]).map((row) => row.repo_id)
  );
  const reposWithActiveJobs = new Set(
    ((activeJobs || []) as RepoIdRow[]).map((row) => row.repo_id)
  );
  const jobsToInsert = repos
    .filter((repo) => !reposWithSnapshots.has(repo.id) && !reposWithActiveJobs.has(repo.id))
    .map((repo) => {
      const seedConfig = DEFAULT_JUDGE_SEED_REPOS.find(
        (item) => item.owner === repo.owner && item.name === repo.name
      );
      const analysisState = buildJudgeJobAnalysisState(
        seedConfig?.requestedAnalysisModes || ["static"]
      );

      return {
        repo_id: repo.id,
        target_ref: null,
        status: "pending",
        requested_by: "judge-seed",
        requested_analysis_modes: analysisState.requestedAnalysisModes,
        static_status: analysisState.staticStatus,
        agent_status: analysisState.agentStatus,
        metadata: { seed: true, repo: `${repo.owner}/${repo.name}` },
      };
    });

  if (jobsToInsert.length > 0) {
    const { error: jobError } = await supabaseAdmin.from("judge_jobs").insert(jobsToInsert);
    if (jobError) {
      return NextResponse.json(
        { error: `Failed to create judge jobs: ${jobError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    repos_seeded: repos.length,
    jobs_created: jobsToInsert.length,
    repos: repos.map((repo) => `${repo.owner}/${repo.name}`),
  });
}
