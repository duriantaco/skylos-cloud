import { NextResponse } from "next/server";
import {
  buildJudgeJobAnalysisState,
  normalizeJudgeAnalysisModes,
  normalizeJudgeRepoIdentity,
} from "@/lib/judge-core";
import { getPendingJudgeSuggestions } from "@/lib/judge";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { requireJudgeAdmin } from "../_shared";

type PromoteBody = {
  suggestion_id?: string | null;
  review_notes?: string | null;
};

type SuggestionRow = {
  id: string;
  host: string;
  owner: string;
  name: string;
  source_url: string;
  requested_analysis_modes: string[] | null;
};

type JobRow = {
  id: string;
};

export async function GET(request: Request) {
  const authError = requireJudgeAdmin(request);
  if (authError) return authError;

  const suggestions = await getPendingJudgeSuggestions();
  return NextResponse.json({ suggestions });
}

export async function POST(request: Request) {
  const authError = requireJudgeAdmin(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as PromoteBody | null;
  if (!body?.suggestion_id) {
    return NextResponse.json(
      { error: "suggestion_id is required" },
      { status: 400 }
    );
  }

  const { data: suggestion, error: suggestionError } = await supabaseAdmin
    .from("judge_suggestions")
    .select("id, host, owner, name, source_url, requested_analysis_modes")
    .eq("id", body.suggestion_id)
    .single();

  if (suggestionError || !suggestion) {
    return NextResponse.json(
      { error: suggestionError?.message || "Suggestion not found" },
      { status: 404 }
    );
  }

  const repoIdentity = normalizeJudgeRepoIdentity({
    host: suggestion.host,
    owner: suggestion.owner,
    name: suggestion.name,
    sourceUrl: suggestion.source_url,
  });

  const { data: repoRow, error: repoError } = await supabaseAdmin
    .from("judge_repos")
    .upsert(
      {
        host: repoIdentity.host,
        owner: repoIdentity.owner,
        name: repoIdentity.name,
        source_url: repoIdentity.sourceUrl,
        is_active: true,
      },
      { onConflict: "host,owner,name" }
    )
    .select("id")
    .single();

  if (repoError || !repoRow) {
    return NextResponse.json(
      { error: repoError?.message || "Failed to upsert Judge repo" },
      { status: 500 }
    );
  }

  const { data: existingJob } = await supabaseAdmin
    .from("judge_jobs")
    .select("id")
    .eq("repo_id", repoRow.id)
    .in("status", ["pending", "running"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let jobId = existingJob?.id || null;

  if (!jobId) {
    const analysisState = buildJudgeJobAnalysisState(
      normalizeJudgeAnalysisModes(
        (suggestion as SuggestionRow).requested_analysis_modes,
        ["static", "agent"]
      )
    );

    const { data: job, error: jobError } = await supabaseAdmin
      .from("judge_jobs")
      .insert({
        repo_id: repoRow.id,
        status: "pending",
        requested_by: "suggestion",
        requested_analysis_modes: analysisState.requestedAnalysisModes,
        static_status: analysisState.staticStatus,
        agent_status: analysisState.agentStatus,
        metadata: {
          suggestion_id: suggestion.id,
          repo: repoIdentity.fullName,
        },
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: jobError?.message || "Failed to create Judge job" },
        { status: 500 }
      );
    }

    jobId = (job as JobRow).id;
  }

  const { error: updateError } = await supabaseAdmin
    .from("judge_suggestions")
    .update({
      status: "queued",
      reviewed_at: new Date().toISOString(),
      review_notes: typeof body.review_notes === "string" ? body.review_notes.trim().slice(0, 1000) : null,
      repo_id: repoRow.id,
      job_id: jobId,
    })
    .eq("id", suggestion.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Failed to update suggestion" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    repo_id: repoRow.id,
    job_id: jobId,
    repo: repoIdentity.fullName,
  });
}
