-- Remove free credits on signup. Charge from day 1, offer 30-day money-back guarantee instead.
ALTER TABLE organizations ALTER COLUMN credits SET DEFAULT 0;

-- Re-create init_workspace with 0 credits instead of 200
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

  INSERT INTO organizations (name, plan, credits)
  VALUES (COALESCE(p_org_name, split_part(p_user_email, '@', 1) || '''s Workspace'), 'free', 0)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, email, role)
  VALUES (v_org_id, p_user_id, p_user_email, 'owner');
END;
$$;
