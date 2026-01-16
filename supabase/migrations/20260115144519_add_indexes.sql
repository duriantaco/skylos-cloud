CREATE INDEX IF NOT EXISTS idx_findings_scan_id 
  ON findings(scan_id);

CREATE INDEX IF NOT EXISTS idx_findings_scan_category 
  ON findings(scan_id, category);

CREATE INDEX IF NOT EXISTS idx_findings_scan_new_unsuppressed 
  ON findings(scan_id, is_new, is_suppressed);

CREATE INDEX IF NOT EXISTS idx_scans_project_branch_created 
  ON scans(project_id, branch, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_project_gate 
  ON scans(project_id, quality_gate_passed, is_overridden);

CREATE INDEX IF NOT EXISTS idx_scans_commit_lookup 
  ON scans(project_id, commit_hash);