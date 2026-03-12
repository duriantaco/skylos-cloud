-- Add AI Defense columns to scans table
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS defense_score jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ops_score jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS owasp_coverage jsonb DEFAULT NULL;

COMMENT ON COLUMN scans.defense_score IS 'AI Defense score: score_pct, risk_rating, weighted_score, weighted_max, passed, total, by_severity';
COMMENT ON COLUMN scans.ops_score IS 'AI Ops score: passed, total, score_pct, rating';
COMMENT ON COLUMN scans.owasp_coverage IS 'OWASP LLM Top 10 coverage map: LLM01-LLM10 with status, coverage_pct, plugins';
