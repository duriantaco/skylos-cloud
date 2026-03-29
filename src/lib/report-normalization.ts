import { isSarif, sarifToSkylosPayload, type NormalizedFinding } from "./sarif";
import {
  isClaudeSecurityReport,
  claudeSecurityToSkylosPayload,
  type ClaudeSecurityMetadata,
} from "./claude-security";

type JsonObject = Record<string, unknown>;

export type NormalizedIncomingReport = {
  summary: JsonObject;
  findings: NormalizedFinding[];
  commit_hash: string;
  branch: string;
  actor: string;
  tool: string;
  source: string;
  source_metadata: ClaudeSecurityMetadata[] | null;
  defense_score?: unknown;
  ops_score?: unknown;
  owasp_coverage?: unknown;
  defense_findings?: unknown[];
  defense_integrations?: unknown[];
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asFindings(value: unknown): NormalizedFinding[] {
  return Array.isArray(value) ? (value as NormalizedFinding[]) : [];
}

function stringField(
  body: JsonObject,
  key: string,
  fallback: string
): string {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function arrayField(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeIncomingReport(body: unknown): NormalizedIncomingReport {
  if (isSarif(body)) {
    const sarifBody = asObject(body);
    const norm = sarifToSkylosPayload(sarifBody);
    return {
      summary: norm.summary,
      findings: norm.findings,
      commit_hash: stringField(sarifBody, "commit_hash", "local"),
      branch: stringField(sarifBody, "branch", "main"),
      actor: stringField(sarifBody, "actor", "sarif"),
      tool: "sarif",
      source: "skylos",
      source_metadata: null,
    };
  }

  if (isClaudeSecurityReport(body)) {
    const claudeBody = asObject(body);
    const norm = claudeSecurityToSkylosPayload(claudeBody);
    return {
      summary: norm.summary,
      findings: norm.findings,
      commit_hash: stringField(claudeBody, "commit_hash", "local"),
      branch: stringField(claudeBody, "branch", "main"),
      actor: stringField(claudeBody, "actor", "claude-security"),
      tool: "claude-code-security",
      source: "claude-code-security",
      source_metadata: norm.source_metadata,
    };
  }

  const reportBody = asObject(body);
  return {
    summary: asObject(reportBody.summary),
    findings: asFindings(reportBody.findings),
    commit_hash: stringField(reportBody, "commit_hash", "local"),
    branch: stringField(reportBody, "branch", "main"),
    actor: stringField(reportBody, "actor", "unknown"),
    tool: stringField(reportBody, "tool", "skylos"),
    source: "skylos",
    source_metadata: null,
    defense_score: reportBody.defense_score ?? null,
    ops_score: reportBody.ops_score ?? null,
    owasp_coverage: reportBody.owasp_coverage ?? null,
    defense_findings: arrayField(reportBody.defense_findings),
    defense_integrations: arrayField(reportBody.defense_integrations),
  };
}
