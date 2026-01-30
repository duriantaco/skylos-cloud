export type IssueGroup = {
  id: string;
  fingerprint: string;
  rule_id: string;
  category: string;
  severity: string;
  canonical_file: string;
  canonical_line: number;
  canonical_snippet: string;
  occurrence_count: number;
  affected_files: string[];
  affected_projects: string[];
  verification_status: string | null;
  suggested_fix: { before: string; after: string; explanation: string } | null;
  status: string;
  last_seen_scan_id: string | null;
};