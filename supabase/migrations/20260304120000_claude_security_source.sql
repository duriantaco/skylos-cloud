-- Add source tracking columns to findings and issue_groups tables.
-- This enables unified tracking of findings from multiple tools
-- (e.g., Skylos native, Claude Code Security, SARIF imports).

-- ── findings table ──────────────────────────────────────────────────────────
ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'skylos',
  ADD COLUMN IF NOT EXISTS source_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_findings_source
  ON findings (source);

-- ── issue_groups table ──────────────────────────────────────────────────────
ALTER TABLE issue_groups
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'skylos';

-- ── credit cost for Claude Security ingestion ───────────────────────────────
INSERT INTO feature_credit_costs (feature_key, cost_credits, cost_period, description, enabled)
VALUES ('claude_security_ingest', 2, 'per_use', 'Ingest Claude Code Security scan results', true)
ON CONFLICT (feature_key) DO UPDATE SET cost_credits = 2;
