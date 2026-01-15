const IGNORE_PATTERN = /(?:#|\/\/)\s*skylos:ignore\s+(SKY-[A-Z]\d{3}(?:\s*,\s*SKY-[A-Z]\d{3})*)(?:\s*[-–—]\s*(.+))?$/i;

export interface InlineSuppression {
  line: number;
  ruleIds: string[];
  reason?: string;
  directive: string;
}

export interface SuppressionResult {
  suppressed: boolean;
  type?: "inline";
  reason?: string;
  directive?: string;
}

export function parseInlineSuppressions(snippet: string): InlineSuppression[] {
  if (!snippet) return [];
  
  const lines = snippet.split("\n");
  const suppressions: InlineSuppression[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(IGNORE_PATTERN);
    
    if (match) {
      const rulesPart = match[1];
      const reason = match[2]?.trim();
      
      const ruleIds = rulesPart
        .split(",")
        .map((r) => r.trim().toUpperCase())
        .filter((r) => /^SKY-[A-Z]\d{3}$/.test(r));

      if (ruleIds.length > 0) {
        const directiveMatch = line.match(/((?:#|\/\/)\s*skylos:ignore.+)$/i);
        const directive = directiveMatch ? directiveMatch[1].trim() : "";

        suppressions.push({
          line: i + 1,
          ruleIds,
          reason,
          directive,
        });
      }
    }
  }

  return suppressions;
}

export function checkInlineSuppression(
  snippet: string,
  ruleId: string,
  findingLineInSnippet: number
): SuppressionResult {
  const normalizedRuleId = ruleId.toUpperCase();
  const suppressions = parseInlineSuppressions(snippet);

  for (const supp of suppressions) {
    if (!supp.ruleIds.includes(normalizedRuleId)) {
      continue;
    }

    const distance = Math.abs(supp.line - findingLineInSnippet);
    if (distance <= 2) {
      return {
        suppressed: true,
        type: "inline",
        reason: supp.reason,
        directive: supp.directive,
      };
    }
  }

  return { suppressed: false };
}

export interface Finding {
  rule_id: string;
  snippet?: string;
  line_in_snippet?: number;
  [key: string]: unknown;
}

export interface ProcessedFinding extends Finding {
  inline_suppressed?: boolean;
  inline_suppression_reason?: string;
  inline_suppression_directive?: string;
}

export function processInlineSuppressions(findings: Finding[]): ProcessedFinding[] {
  return findings.map((finding) => {
    if (!finding.snippet) {
      return finding;
    }

    const lineInSnippet = finding.line_in_snippet || Math.ceil(finding.snippet.split("\n").length / 2);

    const result = checkInlineSuppression(
      finding.snippet,
      finding.rule_id,
      lineInSnippet
    );

    if (result.suppressed) {
      return {
        ...finding,
        inline_suppressed: true,
        inline_suppression_reason: result.reason,
        inline_suppression_directive: result.directive,
      };
    }

    return finding;
  });
}

export function filterInlineSuppressed(findings: Finding[]): Finding[] {
  const processed = processInlineSuppressions(findings);
  return processed.filter((f) => !f.inline_suppressed);
}

export function getSuppressionStats(findings: Finding[]): {
  total: number;
  inlineSuppressed: number;
  active: number;
} {
  const processed = processInlineSuppressions(findings);
  const inlineSuppressed = processed.filter((f) => f.inline_suppressed).length;

  return {
    total: findings.length,
    inlineSuppressed,
    active: findings.length - inlineSuppressed,
  };
}