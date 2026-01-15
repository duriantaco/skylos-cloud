type AnyObj = Record<string, any>;

export type NormalizedFinding = {
  rule_id: string;
  tool_rule_id?: string | null;
  file_path: string;
  line_number: number;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "SECURITY" | "QUALITY" | "DEAD_CODE" | "SECRET";
  snippet?: string | null;
};

export type NormalizedPayload = {
  summary: AnyObj;
  findings: NormalizedFinding[];
};

export function isSarif(body: any): boolean {
  return !!body && typeof body === "object" && Array.isArray(body.runs);
}

function normPath(p: string) {
  let s = String(p || "");

  try { s = decodeURIComponent(s); } catch {}

  s = s.replace(/\\/g, "/");
  s = s.replace(/^file:\/*/i, "");
  s = s.replace(/^[A-Za-z]:\//, "");
  s = s.replace(/^\/+/, "");
  s = s.replace(/^home\/runner\/work\/[^/]+\/[^/]+\//, "");
  s = s.replace(/^__w\/[^/]+\/[^/]+\//, "");
  s = s.replace(/^github\/workspace\//, "");

  return s.trim();
}

function pickSeverity(level?: string, securitySeverity?: any): NormalizedFinding["severity"] {
  const sevNum = Number(securitySeverity);
  if (!Number.isNaN(sevNum)) {
    if (sevNum >= 9) return "CRITICAL";
    if (sevNum >= 7) return "HIGH";
    if (sevNum >= 4) return "MEDIUM";
    return "LOW";
  }

  const l = String(level || "").toLowerCase();
  if (l === "error") return "HIGH";
  if (l === "warning") return "MEDIUM";
  return "LOW";
}

function inferCategoryFromRuleId(ruleId: string): NormalizedFinding["category"] | null {
  const id = String(ruleId || "").toUpperCase();

  if (id.startsWith("SKY-D")) return "SECURITY";
  if (id.startsWith("SKY-S")) return "SECRET";
  if (id.startsWith("SKY-U")) return "DEAD_CODE";
  if (id.startsWith("SKY-Q")) return "QUALITY";

  return null;
}

function pickCategory(
  toolName: string,
  ruleId: string,
  rule: AnyObj | null,
  res: AnyObj | null,
  message: string
): NormalizedFinding["category"] {
  // 1) Explicit category from SARIF exporter (best)
  const resCat = String(res?.properties?.category || "").toUpperCase();
  if (resCat === "SECURITY" || resCat === "QUALITY" || resCat === "DEAD_CODE" || resCat === "SECRET") {
    return resCat as any;
  }

  // 2) Skylos inference by rule prefix
  const inferred = inferCategoryFromRuleId(ruleId);
  if (inferred) return inferred;

  // 3) Generic tool heuristics
  const tn = toolName.toLowerCase();
  const tags: string[] =
    (rule?.properties?.tags && Array.isArray(rule.properties.tags) ? rule.properties.tags : []).map((x: any) =>
      String(x).toLowerCase()
    );

  const msg = String(message || "").toLowerCase();

  const looksSecret =
    tags.includes("secret") ||
    tags.includes("secrets") ||
    tn.includes("gitleaks") ||
    tn.includes("trufflehog") ||
    msg.includes("secret") ||
    msg.includes("apikey") ||
    msg.includes("api key") ||
    msg.includes("token");

  if (looksSecret) return "SECRET";

  const looksSecurity =
    tags.includes("security") ||
    tags.includes("sast") ||
    tn.includes("codeql") ||
    tn.includes("semgrep") ||
    tn.includes("snyk") ||
    tn.includes("trivy") ||
    tn.includes("bandit");

  if (looksSecurity) return "SECURITY";

  const looksDeadCode =
    tags.includes("deadcode") ||
    tags.includes("dead-code") ||
    msg.includes("dead code") ||
    msg.includes("unused");

  if (looksDeadCode) return "DEAD_CODE";

  return "QUALITY";
}

export function sarifToSkylosPayload(sarif: AnyObj): NormalizedPayload {
  const findings: NormalizedFinding[] = [];

  const runs: AnyObj[] = Array.isArray(sarif.runs) ? sarif.runs : [];
  const toolsUsed = new Set<string>();

  for (const run of runs) {
    const toolName = String(run?.tool?.driver?.name || "SARIF");
    toolsUsed.add(toolName);

    const rulesArr: AnyObj[] = Array.isArray(run?.tool?.driver?.rules) ? run.tool.driver.rules : [];
    const ruleById = new Map<string, AnyObj>();
    for (const r of rulesArr) {
      const id = String(r?.id || "");
      if (id) ruleById.set(id, r);
    }

    const results: AnyObj[] = Array.isArray(run?.results) ? run.results : [];
    for (const res of results) {
      const toolRuleId = String(res?.ruleId || res?.rule?.id || "UNKNOWN");
      const rule = ruleById.get(toolRuleId) || null;

      const msg = String(res?.message?.text || res?.message?.markdown || "Issue");

      const loc0 = Array.isArray(res?.locations) ? res.locations[0] : null;
      const phys = loc0?.physicalLocation || null;

      const uriRaw = String(phys?.artifactLocation?.uri || "");
      const filePath = normPath(uriRaw);

      const region = phys?.region || {};
      const line = Number(region?.startLine || 0) || 0;

      const snippet =
        typeof region?.snippet?.text === "string"
          ? String(region.snippet.text).slice(0, 2000)
          : null;

      const securitySeverity = rule?.properties?.["security-severity"] ?? rule?.properties?.securitySeverity;

      const severity = pickSeverity(res?.level, securitySeverity);
      const category = pickCategory(toolName, toolRuleId, rule, res, msg);

      // IMPORTANT:
      // - For Skylos, keep rule_id stable like "SKY-D211" (do NOT prefix)
      // - For other tools, prefix "Tool:Rule"
      const isSkylos = toolName.toLowerCase() === "skylos";
      const rule_id = isSkylos ? toolRuleId : `${toolName}:${toolRuleId}`;

      findings.push({
        rule_id,
        tool_rule_id: toolRuleId,
        file_path: filePath || "unknown",
        line_number: line,
        message: msg,
        severity,
        category,
        snippet,
      });
    }
  }

  const danger_count = findings.filter(
    (f) => f.category === "SECURITY" && (f.severity === "HIGH" || f.severity === "CRITICAL")
  ).length;

  const quality_count = findings.filter((f) => f.category === "QUALITY").length;
  const secret_count = findings.filter((f) => f.category === "SECRET").length;
  const dead_code_count = findings.filter((f) => f.category === "DEAD_CODE").length;

  const summary = {
    source: "sarif",
    tools: Array.from(toolsUsed),
    danger_count,
    quality_count,
    secret_count,
    dead_code_count,
    total_issues: findings.length,
  };

  return { summary, findings };
}
