CREATE TABLE issue_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  
  fingerprint TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  canonical_file TEXT,
  canonical_line INT,
  canonical_snippet TEXT,
  
  occurrence_count INT DEFAULT 1,
  affected_projects TEXT[],
  affected_files TEXT[],
  
  verification_status TEXT,
  suggested_fix JSONB, 
  data_flow JSONB,

  status TEXT DEFAULT 'open',
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  
  UNIQUE(org_id, fingerprint)
);

ALTER TABLE findings ADD COLUMN group_id UUID REFERENCES issue_groups(id);