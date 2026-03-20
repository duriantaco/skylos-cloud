-- Summary columns on scans (cheap to query for free badge)
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS provenance_summary jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provenance_agent_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provenance_confidence text DEFAULT NULL;

-- Normalized table for Pro drill-down and findings filter
CREATE TABLE provenance_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    agent_authored BOOLEAN NOT NULL DEFAULT false,
    agent_name TEXT,
    agent_lines JSONB DEFAULT '[]',
    indicators JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provenance_scan_file UNIQUE(scan_id, file_path)
);

CREATE INDEX idx_provenance_files_scan ON provenance_files(scan_id);
CREATE INDEX idx_provenance_files_project ON provenance_files(project_id);
CREATE INDEX idx_provenance_files_agent ON provenance_files(agent_authored) WHERE agent_authored = true;

-- RLS: follow defense_normalized_tables pattern
ALTER TABLE provenance_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY provenance_files_service ON provenance_files FOR ALL TO service_role USING (true);
CREATE POLICY provenance_files_org_read ON provenance_files FOR SELECT TO authenticated
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.org_id
    WHERE om.user_id = auth.uid()
  ));

-- Credit costs for new features
INSERT INTO feature_credit_costs (feature_key, cost_credits, cost_period, description, enabled)
VALUES
  ('provenance_risk_intersection', 5, 'per_use', 'AI provenance risk cross-analysis', true),
  ('mcp_provenance_scan', 2, 'per_use', 'MCP provenance scan', true);
