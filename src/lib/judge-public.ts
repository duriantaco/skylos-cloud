import type { JudgeFindingPreview } from "./judge-core";

type JudgeSnapshotSummary = Record<string, unknown>;

export type JudgePublicSnapshotLike = {
  analysis_kind?: string | null;
  status?: string | null;
  overall_score?: number | null;
  security_score?: number | null;
  quality_score?: number | null;
  dead_code_score?: number | null;
  summary?: JudgeSnapshotSummary | null;
  top_findings?: JudgeFindingPreview[] | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function readIssueCount(summary: JudgeSnapshotSummary | null | undefined): number {
  const summaryObject = asRecord(summary);
  const counts = asRecord(summaryObject?.counts);

  if (!counts) {
    return 0;
  }

  const totalIssues = readNumber(counts.total_issues);
  if (totalIssues > 0) {
    return totalIssues;
  }

  return (
    readNumber(counts.security) +
    readNumber(counts.secrets) +
    readNumber(counts.quality) +
    readNumber(counts.dead_code)
  );
}

export function hasPublishedJudgeScorecard(
  snapshot: JudgePublicSnapshotLike | null | undefined
): boolean {
  if (!snapshot) {
    return false;
  }

  if (snapshot.analysis_kind !== "static" || snapshot.status !== "ready") {
    return false;
  }

  const issueCount = readIssueCount(snapshot.summary);
  const topFindingCount = Array.isArray(snapshot.top_findings)
    ? snapshot.top_findings.length
    : 0;
  const hasNonZeroScore =
    readNumber(snapshot.overall_score) > 0 ||
    readNumber(snapshot.security_score) > 0 ||
    readNumber(snapshot.quality_score) > 0 ||
    readNumber(snapshot.dead_code_score) > 0;

  return hasNonZeroScore || issueCount > 0 || topFindingCount > 0;
}
