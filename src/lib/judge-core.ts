import type { NormalizedFinding, NormalizedPayload } from "./sarif";

type JsonObject = Record<string, unknown>;

export const JUDGE_SCORING_VERSION = "v1";

export type JudgeAnalysisKind = "static" | "agent";
export type JudgeAnalysisStatus =
  | "not_requested"
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export type JudgeRepoIdentity = {
  host: string;
  owner: string;
  name: string;
  fullName: string;
  sourceUrl: string;
};

export type JudgeFindingPreview = {
  ruleId: string;
  filePath: string;
  lineNumber: number;
  severity: NormalizedFinding["severity"];
  category: NormalizedFinding["category"];
  message: string;
};

export type JudgeSnapshotComputation = {
  grade: string;
  overallScore: number;
  securityScore: number;
  qualityScore: number;
  deadCodeScore: number;
  confidenceScore: number;
  summary: JsonObject;
  topFindings: JudgeFindingPreview[];
  fairnessNotes: string[];
};

export type JudgeJobAnalysisState = {
  requestedAnalysisModes: JudgeAnalysisKind[];
  staticStatus: JudgeAnalysisStatus;
  agentStatus: JudgeAnalysisStatus;
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function readNumber(value: JsonObject, key: string): number {
  const candidate = value[key];

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function severityWeight(severity: NormalizedFinding["severity"]): number {
  if (severity === "CRITICAL") return 26;
  if (severity === "HIGH") return 14;
  if (severity === "MEDIUM") return 6;
  return 2;
}

function severityRank(severity: NormalizedFinding["severity"]): number {
  if (severity === "CRITICAL") return 4;
  if (severity === "HIGH") return 3;
  if (severity === "MEDIUM") return 2;
  return 1;
}

function categoryRank(category: NormalizedFinding["category"]): number {
  if (category === "SECURITY") return 4;
  if (category === "SECRET") return 3;
  if (category === "QUALITY") return 2;
  return 1;
}

function toGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function normalizeNotes(notes: string[] | null | undefined): string[] {
  const deduped = new Set<string>();

  for (const note of notes || []) {
    const value = String(note || "").trim();
    if (value) {
      deduped.add(value);
    }
  }

  return Array.from(deduped);
}

export function normalizeJudgeAnalysisModes(
  input: unknown,
  fallback: JudgeAnalysisKind[] = ["static"]
): JudgeAnalysisKind[] {
  const values = Array.isArray(input) ? input : fallback;
  const normalized = new Set<JudgeAnalysisKind>();

  for (const value of values) {
    const mode = String(value || "").trim().toLowerCase();
    if (mode === "static" || mode === "agent") {
      normalized.add(mode);
    }
  }

  if (normalized.size === 0) {
    for (const value of fallback) {
      normalized.add(value);
    }
  }

  if (normalized.size === 0) {
    normalized.add("static");
  }

  return Array.from(normalized);
}

export function buildJudgeJobAnalysisState(
  requestedModes: JudgeAnalysisKind[]
): JudgeJobAnalysisState {
  const modes = normalizeJudgeAnalysisModes(requestedModes);
  const modeSet = new Set(modes);

  return {
    requestedAnalysisModes: modes,
    staticStatus: modeSet.has("static") ? "pending" : "not_requested",
    agentStatus: modeSet.has("agent") ? "pending" : "not_requested",
  };
}

export function normalizeJudgeRepoIdentity(input: {
  host?: string | null;
  owner: string;
  name: string;
  sourceUrl?: string | null;
}): JudgeRepoIdentity {
  const host = String(input.host || "github").trim().toLowerCase();
  const owner = String(input.owner || "").trim().toLowerCase();
  const name = String(input.name || "").trim().toLowerCase();

  if (!owner || !name) {
    throw new Error("Judge repo identity requires both owner and name");
  }

  const sourceUrl =
    typeof input.sourceUrl === "string" && input.sourceUrl.trim().length > 0
      ? input.sourceUrl.trim()
      : `https://${host}.com/${owner}/${name}`;

  return {
    host,
    owner,
    name,
    fullName: `${owner}/${name}`,
    sourceUrl,
  };
}

export function computeJudgeSnapshot(args: {
  normalizedPayload: NormalizedPayload;
  confidenceScore?: number | null;
  fairnessNotes?: string[] | null;
  maxTopFindings?: number;
  analysisMode?: string | null;
  tool?: string | null;
  source?: string | null;
}): JudgeSnapshotComputation {
  const summary = asObject(args.normalizedPayload.summary);
  const findings = args.normalizedPayload.findings || [];
  const fairnessNotes = normalizeNotes(args.fairnessNotes);
  const confidenceScore = clampScore(args.confidenceScore ?? 100);
  const maxTopFindings = Math.max(1, Math.min(args.maxTopFindings ?? 12, 25));

  let securityCount = 0;
  let secretCount = 0;
  let qualityCount = 0;
  let deadCodeCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let securityPenalty = 0;

  for (const finding of findings) {
    if (finding.category === "SECURITY" || finding.category === "SECRET") {
      securityCount += 1;
      securityPenalty += severityWeight(finding.severity);
      if (finding.category === "SECRET") {
        secretCount += 1;
        securityPenalty += 4;
      }
      if (finding.severity === "CRITICAL") criticalCount += 1;
      else if (finding.severity === "HIGH") highCount += 1;
      else if (finding.severity === "MEDIUM") mediumCount += 1;
      else lowCount += 1;
      continue;
    }

    if (finding.category === "QUALITY") {
      qualityCount += 1;
      continue;
    }

    if (finding.category === "DEAD_CODE") {
      deadCodeCount += 1;
    }
  }

  securityCount = Math.max(
    securityCount,
    readNumber(summary, "danger_count") + readNumber(summary, "secret_count")
  );
  secretCount = Math.max(secretCount, readNumber(summary, "secret_count"));
  qualityCount = Math.max(qualityCount, readNumber(summary, "quality_count"));
  deadCodeCount = Math.max(deadCodeCount, readNumber(summary, "dead_code_count"));

  const securityScore = clampScore(100 - Math.min(100, securityPenalty));
  const qualityScore = clampScore(100 - Math.min(100, qualityCount * 4));
  const deadCodeScore = clampScore(100 - Math.min(100, deadCodeCount * 3));
  const overallScore = clampScore(
    securityScore * 0.45 + qualityScore * 0.30 + deadCodeScore * 0.25
  );

  const topFindings = findings
    .slice()
    .sort((a, b) => {
      const severityDiff = severityRank(b.severity) - severityRank(a.severity);
      if (severityDiff !== 0) return severityDiff;
      const categoryDiff = categoryRank(b.category) - categoryRank(a.category);
      if (categoryDiff !== 0) return categoryDiff;
      const fileDiff = String(a.file_path || "").localeCompare(String(b.file_path || ""));
      if (fileDiff !== 0) return fileDiff;
      return Number(a.line_number || 0) - Number(b.line_number || 0);
    })
    .slice(0, maxTopFindings)
    .map((finding) => ({
      ruleId: finding.rule_id,
      filePath: finding.file_path,
      lineNumber: finding.line_number,
      severity: finding.severity,
      category: finding.category,
      message: finding.message,
    }));

  return {
    grade: toGrade(overallScore),
    overallScore,
    securityScore,
    qualityScore,
    deadCodeScore,
    confidenceScore,
    summary: {
      scoring_version: JUDGE_SCORING_VERSION,
      weights: {
        security: 0.45,
        quality: 0.30,
        dead_code: 0.25,
      },
      tool: args.tool || "skylos",
      source: args.source || "skylos",
      analysis_mode: args.analysisMode || null,
      counts: {
        total_issues: Math.max(readNumber(summary, "total_issues"), findings.length),
        security: securityCount,
        secrets: secretCount,
        quality: qualityCount,
        dead_code: deadCodeCount,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    },
    topFindings,
    fairnessNotes,
  };
}
