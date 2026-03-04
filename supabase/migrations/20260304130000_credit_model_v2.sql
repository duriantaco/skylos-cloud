-- Credit Model V2: Time-bound Pro, compute-only credit gates, starter credits
-- 1) Remove monthly features — they become plan-gated, not credit-gated
DELETE FROM feature_credit_costs WHERE feature_key IN (
  'dashboard_access',
  'team_collaboration',
  'historical_tracking',
  'slack_integration',
  'discord_integration',
  'trend_analytics'
);

-- 2) Add ONLY compute-heavy per-use credit features
INSERT INTO feature_credit_costs (id, feature_key, cost_credits, cost_period, description, enabled)
VALUES
  (gen_random_uuid(), 'ai_triage', 5, 'per_use', 'AI-powered issue triage (LLM compute)', true),
  (gen_random_uuid(), 'scan_diff', 2, 'per_use', 'Compare two scans side by side', true)
ON CONFLICT (feature_key) DO NOTHING;

-- 3) Add pro_expires_at to organizations (time-bound Pro access)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

-- 4) For existing Pro users: set pro_expires_at to 90 days from now (grandfather them)
UPDATE organizations SET pro_expires_at = now() + interval '90 days'
WHERE plan = 'pro' AND pro_expires_at IS NULL;

-- 5) Enterprise users: set far-future expiry (effectively unlimited)
UPDATE organizations SET pro_expires_at = '2099-12-31'::timestamptz
WHERE plan = 'enterprise' AND pro_expires_at IS NULL;

-- 6) Update init_workspace to give 50 starter credits + 7-day Pro trial
CREATE OR REPLACE FUNCTION public.init_workspace(
  p_user_id UUID,
  p_user_email TEXT,
  p_org_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_existing_org UUID;
BEGIN
  SELECT org_id INTO v_existing_org
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing_org IS NOT NULL THEN
    IF p_org_name IS NOT NULL THEN
      UPDATE organizations SET name = p_org_name WHERE id = v_existing_org;
    END IF;
    RETURN;
  END IF;

  -- Create new org with 50 starter credits + 7-day Pro trial
  INSERT INTO organizations (name, plan, credits, pro_expires_at)
  VALUES (
    COALESCE(p_org_name, split_part(p_user_email, '@', 1) || '''s Workspace'),
    'pro',
    50,
    now() + interval '7 days'
  )
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, email, role)
  VALUES (v_org_id, p_user_id, p_user_email, 'owner');

  -- Record starter credit transaction
  INSERT INTO credit_transactions (org_id, amount, balance_after, transaction_type, description, metadata)
  VALUES (
    v_org_id,
    50,
    50,
    'bonus',
    'Welcome bonus: 50 starter credits + 7-day Pro trial',
    '{"type": "starter_credits", "feature_key": "signup_bonus"}'::jsonb
  );
END;
$$;
