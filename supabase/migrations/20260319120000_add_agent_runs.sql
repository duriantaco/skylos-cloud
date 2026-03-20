CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    command TEXT NOT NULL,        -- 'scan', 'verify', 'remediate', 'cleanup'
    model TEXT,
    provider TEXT,
    duration_seconds NUMERIC,
    commit_hash TEXT,
    branch TEXT,
    actor TEXT,
    status TEXT NOT NULL DEFAULT 'completed',  -- 'completed', 'failed'
    summary JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_runs_project ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_org ON agent_runs(org_id);
CREATE INDEX idx_agent_runs_created ON agent_runs(created_at DESC);

-- RLS
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_runs_service ON agent_runs FOR ALL TO service_role USING (true);
CREATE POLICY agent_runs_org_read ON agent_runs FOR SELECT TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
