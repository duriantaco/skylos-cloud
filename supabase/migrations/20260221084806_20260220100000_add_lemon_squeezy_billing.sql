
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  pack_name TEXT NOT NULL,
  ls_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_credit_purchases_org_id ON credit_purchases (org_id, created_at DESC);
CREATE INDEX idx_credit_purchases_ls_order ON credit_purchases (ls_order_id) WHERE ls_order_id IS NOT NULL;

INSERT INTO feature_credit_costs (feature_key, cost_credits, cost_period, description, enabled)
VALUES
  ('scan_upload', 1, 'per_use', 'Scan upload to cloud', true),
  ('pr_review', 3, 'per_use', 'PR inline review comments', true),
  ('mcp_analyze', 1, 'per_use', 'MCP dead code analysis', true),
  ('mcp_security_scan', 2, 'per_use', 'MCP security scan', true),
  ('mcp_quality_check', 1, 'per_use', 'MCP quality check', true),
  ('mcp_secrets_scan', 1, 'per_use', 'MCP secrets scan', true),
  ('mcp_remediate', 10, 'per_use', 'MCP AI remediation', true)
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org purchases"
  ON credit_purchases FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );
