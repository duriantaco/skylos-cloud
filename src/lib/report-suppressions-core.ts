export type SuppressionRow = {
  rule_id?: string | null;
  file_path?: string | null;
  line_number?: number | null;
  expires_at?: string | null;
};

export function buildSuppressionKey(
  ruleId: string,
  filePath: string,
  lineNumber: number
): string {
  return `${ruleId}::${filePath}::${lineNumber}`;
}

export function buildActiveSuppressionKeys(
  rows: SuppressionRow[],
  nowIso: string,
  normalizePath: (filePath: string) => string
): Set<string> {
  const activeSuppressions = new Set<string>();

  for (const row of rows) {
    if (row.expires_at && String(row.expires_at) <= nowIso) {
      continue;
    }

    const ruleId = String(row.rule_id || "UNKNOWN");
    const filePath = normalizePath(String(row.file_path || ""));
    const lineNum = Number(row.line_number || 0);
    activeSuppressions.add(buildSuppressionKey(ruleId, filePath, lineNum));
  }

  return activeSuppressions;
}
