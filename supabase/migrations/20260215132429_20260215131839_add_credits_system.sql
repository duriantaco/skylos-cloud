ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE organizations SET credits = 1000 WHERE credits = 0;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, 
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'deduction', 'refund', 'bonus'
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_credit_transactions_org_id ON credit_transactions(org_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);

CREATE TABLE IF NOT EXISTS feature_credit_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  cost_credits INTEGER NOT NULL,
  cost_period TEXT DEFAULT 'one_time',
  description TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO feature_credit_costs (feature_key, cost_credits, cost_period, description) VALUES
  ('dashboard_access', 100, 'monthly', 'Cloud Dashboard access per month'),
  ('team_collaboration', 200, 'monthly', 'Team collaboration features (comments, assignments) per user per month'),
  ('compliance_report', 500, 'per_use', 'Generate compliance report (PCI DSS, SOC2, HIPAA)'),
  ('historical_tracking', 50, 'monthly', 'Historical scan tracking and trends per month'),
  ('slack_integration', 100, 'monthly', 'Slack webhook notifications per month'),
  ('discord_integration', 100, 'monthly', 'Discord webhook notifications per month'),
  ('trend_analytics', 150, 'monthly', 'Advanced trend analytics and charts per month')
ON CONFLICT (feature_key) DO NOTHING;

CREATE OR REPLACE FUNCTION deduct_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT credits INTO v_current_balance
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE organizations
  SET credits = v_new_balance,
      credits_updated_at = NOW()
  WHERE id = p_org_id;

  INSERT INTO credit_transactions (
    org_id,
    amount,
    balance_after,
    transaction_type,
    description,
    metadata
  ) VALUES (
    p_org_id,
    -p_amount,
    v_new_balance,
    'deduction',
    p_description,
    p_metadata
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_credits(
  p_org_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT, -- 'purchase', 'bonus', 'refund'
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}',
  p_created_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT credits INTO v_current_balance
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_new_balance := v_current_balance + p_amount;

  UPDATE organizations
  SET credits = v_new_balance,
      credits_updated_at = NOW()
  WHERE id = p_org_id;

  INSERT INTO credit_transactions (
    org_id,
    amount,
    balance_after,
    transaction_type,
    description,
    metadata,
    created_by
  ) VALUES (
    p_org_id,
    p_amount,
    v_new_balance,
    p_transaction_type,
    p_description,
    p_metadata,
    p_created_by
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's credit transactions"
  ON credit_transactions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );


ALTER TABLE feature_credit_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view feature costs"
  ON feature_credit_costs FOR SELECT
  TO authenticated
  USING (enabled = true);

COMMENT ON TABLE credit_transactions IS 'Audit trail of all credit additions and deductions';
COMMENT ON TABLE feature_credit_costs IS 'Configurable credit costs for different features';
COMMENT ON COLUMN organizations.credits IS 'Current credit balance for the organization';
