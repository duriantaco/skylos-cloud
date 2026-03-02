-- Fix infinite recursion in organization_members RLS policies.
-- The members_read_own_org and admins_update_members policies query
-- organization_members inside their own USING clause, which triggers
-- the SELECT policy again → infinite loop.
--
-- Solution: a SECURITY DEFINER function that bypasses RLS to return
-- the caller's org_ids, then reference that function in policies.

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = target_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

-- Replace the recursive SELECT policy
DROP POLICY IF EXISTS "members_read_own_org" ON organization_members;
CREATE POLICY "members_read_own_org" ON organization_members
  FOR SELECT USING (
    org_id IN (SELECT get_user_org_ids())
  );

-- Replace the recursive UPDATE policy
DROP POLICY IF EXISTS "admins_update_members" ON organization_members;
CREATE POLICY "admins_update_members" ON organization_members
  FOR UPDATE USING (
    is_org_admin(org_id)
    AND user_id != auth.uid()
  );
