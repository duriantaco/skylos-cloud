-- Change default credits for new organizations from 0 to 200.
-- New users get 200 free scans to evaluate the product before buying.
ALTER TABLE organizations ALTER COLUMN credits SET DEFAULT 200;

-- Also update init_workspace to explicitly grant 200 credits on org creation
-- (belt and suspenders — the column default handles it, but be explicit).
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
  VALUES (COALESCE(p_org_name, split_part(p_user_email, '@', 1) || '''s Workspace'), 'free', 200)
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (org_id, user_id, email, role)
  VALUES (v_org_id, p_user_id, p_user_email, 'owner');
END;
$$;
