ALTER TABLE findings ADD COLUMN IF NOT EXISTS sca_metadata jsonb;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ai_code_detected boolean DEFAULT false;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ai_code_stats jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_assurance_enabled boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_findings_dependency
  ON findings(category) WHERE category = 'DEPENDENCY';
