import type { NormalizedFinding, NormalizedPayload } from "./sarif";

type AnyObj = Record<string, unknown>;


const SEVERITY_MAP: Record<string, NormalizedFinding["severity"]> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  info: "LOW",
  informational: "LOW",
};

function mapSeverity(raw?: string): NormalizedFinding["severity"] {
  if (!raw) return "MEDIUM";
  return SEVERITY_MAP[raw.toLowerCase().trim()] ?? "MEDIUM";
}


export function isClaudeSecurityReport(body: unknown): boolean {
  if (!body || typeof body !== "object") 
    return false;

  const record = body as AnyObj;

  const toolStr = String(record.tool || record.scanner || record.source || "");
  const lowerTool = toolStr.toLowerCase();
  const hasDefensePayload =
    "defense_score" in record ||
    "ops_score" in record ||
    "owasp_coverage" in record ||
    "defense_findings" in record ||
    "defense_integrations" in record;

  // Native Skylos defense uploads also carry a tool key and findings array.
  // Exclude them before applying Claude Security heuristics.
  if (hasDefensePayload || lowerTool === "skylos-defend") {
    return false;
  }

  let findings: unknown[] | null = null;
  for (const key of ["findings", "vulnerabilities", "results"]) {
    const val = record[key];
    if (Array.isArray(val)) {
      findings = val;
      break;
    }
  }
  if (findings === null) 
    return false;

  const claudeToolHint =
    lowerTool.includes("claude") ||
    lowerTool.includes("anthropic") ||
    "scan_metadata" in record;

  if (findings.length === 0) 
    return claudeToolHint;

  const sample = findings[0];
  if (typeof sample !== "object" || sample === null) 
    return false;

  return (
    "confidence_score" in sample ||
    "confidence" in sample ||
    "exploit_scenario" in sample ||
    "exploit" in sample ||
    claudeToolHint
  );
}


export type ClaudeSecurityMetadata = {
  confidence_score?: number;
  exploit_scenario?: string;
  suggested_fix?: string;
  cwe?: string;
};

export function claudeSecurityToSkylosPayload(data: AnyObj): NormalizedPayload & {
  source: "claude-code-security";
  source_metadata: ClaudeSecurityMetadata[];
} {
  const rawFindingsValue =
    data.findings ?? data.vulnerabilities ?? data.results ?? [];
  const rawFindings: AnyObj[] = Array.isArray(rawFindingsValue)
    ? rawFindingsValue.filter((item): item is AnyObj => !!item && typeof item === "object")
    : [];

  const findings: NormalizedFinding[] = [];
  const source_metadata: ClaudeSecurityMetadata[] = [];
  const seen = new Set<string>();

  for (const f of rawFindings) {
    const location =
      f.location && typeof f.location === "object"
        ? (f.location as AnyObj)
        : null;

    let ruleId = String(f.rule_id || f.id || f.type || "unknown");
    if (!ruleId.startsWith("CCS:")) ruleId = `CCS:${ruleId}`;

    const filePath = String(
      f.file_path ||
      f.file ||
      location?.file ||
      "unknown"
    );

    let line = Number(f.line_number ?? f.line ?? location?.line ?? 0);
    if (!Number.isFinite(line) || line < 1) line = 1;

    const dedupKey = `${ruleId}::${filePath}::${line}`;
    if (seen.has(dedupKey)) 
      continue;
    seen.add(dedupKey);

    const message = String(
      f.message || f.description || f.title || "Security issue"
    );

    const severity = mapSeverity(
      typeof f.severity === "string"
        ? f.severity
        : typeof f.level === "string"
        ? f.level
        : undefined
    );

    const snippet =
      typeof (f.snippet ?? f.code ?? f.vulnerable_code) === "string"
        ? String(f.snippet ?? f.code ?? f.vulnerable_code).slice(0, 2000)
        : null;

    findings.push({
      rule_id: ruleId,
      tool_rule_id: ruleId,
      file_path: filePath,
      line_number: line,
      message,
      severity,
      category: "SECURITY",
      snippet,
    });

    const meta: ClaudeSecurityMetadata = {};
    const confidence = f.confidence_score ?? f.confidence;
    if (confidence != null) {
      const num = Number(confidence);
      if (Number.isFinite(num)) meta.confidence_score = num;
    }
    const exploit = f.exploit_scenario || f.exploit;
    if (exploit) meta.exploit_scenario = String(exploit);
    const fix = f.fix || f.remediation || f.suggested_fix;
    if (fix) meta.suggested_fix = String(fix);
    const cwe = f.cwe || f.cwe_id;
    if (cwe) meta.cwe = String(cwe);

    source_metadata.push(meta);
  }

  const danger_count = findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  ).length;

  const summary = {
    source: "claude-code-security",
    tools: ["claude-code-security"],
    danger_count,
    quality_count: 0,
    secret_count: 0,
    dead_code_count: 0,
    total_issues: findings.length,
  };

  return { summary, findings, source: "claude-code-security", source_metadata };
}
