-- Fix init_workspace to assign 'owner' role instead of 'admin'
-- The RBAC migration expects workspace creators to be 'owner' for billing access.
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
  -- Check if user already has an org
  SELECT org_id INTO v_existing_org
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing_org IS NOT NULL THEN
    -- Already has an org, update name if provided
    IF p_org_name IS NOT NULL THEN
      UPDATE organizations SET name = p_org_name WHERE id = v_existing_org;
    END IF;
    RETURN;
  END IF;

  -- Create new org
  INSERT INTO organizations (name, plan)
  VALUES (COALESCE(p_org_name, split_part(p_user_email, '@', 1) || '''s Workspace'), 'free')
  RETURNING id INTO v_org_id;

  -- Add user as owner (not admin)
  INSERT INTO organization_members (org_id, user_id, email, role)
  VALUES (v_org_id, p_user_id, p_user_email, 'owner');
END;
$$;
