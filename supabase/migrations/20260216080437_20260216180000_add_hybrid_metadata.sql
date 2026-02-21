ALTER TABLE scans
ADD COLUMN IF NOT EXISTS analysis_mode text NOT NULL DEFAULT 'static';

ALTER TABLE findings
ADD COLUMN IF NOT EXISTS analysis_source text,
ADD COLUMN IF NOT EXISTS analysis_confidence text,
ADD COLUMN IF NOT EXISTS llm_verdict text,
ADD COLUMN IF NOT EXISTS llm_rationale text,
ADD COLUMN IF NOT EXISTS llm_challenged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_findings_analysis_source
ON findings(analysis_source) WHERE analysis_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_findings_needs_review
ON findings(needs_review) WHERE needs_review = true;
