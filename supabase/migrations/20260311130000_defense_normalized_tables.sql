-- Normalized AI Defense tables for trending, per-integration views, and queryable findings

-- Per-scan aggregate scores (one row per scan that has defense data)
CREATE TABLE IF NOT EXISTS defense_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    weighted_score INTEGER NOT NULL DEFAULT 0,
    weighted_max INTEGER NOT NULL DEFAULT 0,
    score_pct INTEGER NOT NULL DEFAULT 100,
    risk_rating TEXT NOT NULL DEFAULT 'SECURE',
    passed INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    ops_passed INTEGER NOT NULL DEFAULT 0,
    ops_total INTEGER NOT NULL DEFAULT 0,
    ops_score_pct INTEGER NOT NULL DEFAULT 100,
    ops_rating TEXT NOT NULL DEFAULT 'EXCELLENT',
    integrations_found INTEGER NOT NULL DEFAULT 0,
    files_scanned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(scan_id)
);

-- Per-integration breakdown (one row per LLM integration per scan)
CREATE TABLE IF NOT EXISTS defense_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    integration_type TEXT NOT NULL DEFAULT 'chat',
    location TEXT NOT NULL,
    model TEXT,
    tools_count INTEGER NOT NULL DEFAULT 0,
    input_sources JSONB DEFAULT '[]',
    weighted_score INTEGER NOT NULL DEFAULT 0,
    weighted_max INTEGER NOT NULL DEFAULT 0,
    score_pct INTEGER NOT NULL DEFAULT 100,
    risk_rating TEXT NOT NULL DEFAULT 'SECURE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_defense_integrations_scan_location UNIQUE(scan_id, location)
);

-- Individual check results (one row per plugin check per integration per scan)
CREATE TABLE IF NOT EXISTS defense_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES defense_integrations(id) ON DELETE CASCADE,
    plugin_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'defense',
    severity TEXT NOT NULL DEFAULT 'medium',
    weight INTEGER NOT NULL DEFAULT 2,
    passed BOOLEAN NOT NULL DEFAULT false,
    location TEXT,
    message TEXT,
    owasp_llm TEXT,
    remediation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_defense_scores_project ON defense_scores(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_defense_scores_scan ON defense_scores(scan_id);
CREATE INDEX IF NOT EXISTS idx_defense_integrations_scan ON defense_integrations(scan_id);
CREATE INDEX IF NOT EXISTS idx_defense_integrations_project ON defense_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_defense_findings_scan ON defense_findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_defense_findings_integration ON defense_findings(integration_id);
CREATE INDEX IF NOT EXISTS idx_defense_findings_project ON defense_findings(project_id);

-- RLS policies
ALTER TABLE defense_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_findings ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "service_role_all_defense_scores" ON defense_scores
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_defense_integrations" ON defense_integrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_defense_findings" ON defense_findings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read their org's defense data
CREATE POLICY "org_members_read_defense_scores" ON defense_scores
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.org_id = p.org_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "org_members_read_defense_integrations" ON defense_integrations
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.org_id = p.org_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "org_members_read_defense_findings" ON defense_findings
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.org_id = p.org_id
            WHERE om.user_id = auth.uid()
        )
    );
