import { createHash } from 'crypto';

export type Finding = {
  id: string;
  rule_id: string;
  category: string;
  severity: string;
  file_path: string;
  line_number: number;
  snippet: string | null;
  message?: string;
};

export function computeGroupFingerprint(finding: Finding): string {
  const pattern = normalizePattern(finding);
  const input = `${finding.rule_id}|${finding.category}|${pattern}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function normalizePattern(f: Finding): string {
  if (!f.snippet) return f.message?.slice(0, 100) || f.rule_id;
  
  let normalized = f.snippet
    .replace(/["'][^"']{8,}["']/g, '"<STRING>"')
    .replace(/\b[a-z_][a-z0-9_]*\b/gi, '<VAR>')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized.slice(0, 200);
}

export function groupFindings(findings: Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>();
  
  for (const f of findings) {
    const fp = computeGroupFingerprint(f);
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp)!.push(f);
  }
  
  return groups;
}