ALTER TABLE organization_members
  ADD CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member', 'viewer'));


UPDATE organization_members SET role = 'owner' WHERE role = 'admin';

DROP POLICY IF EXISTS "Enable delete for project members" ON projects;
CREATE POLICY "Enable delete for project members" ON projects
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = projects.org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  ));

DROP POLICY IF EXISTS "Enable read for members" ON organization_members;
DROP POLICY IF EXISTS "members_read_own_org" ON organization_members;
CREATE POLICY "members_read_own_org" ON organization_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_update_members" ON organization_members;
CREATE POLICY "admins_update_members" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organization_members.org_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
    AND user_id != auth.uid()
  );
