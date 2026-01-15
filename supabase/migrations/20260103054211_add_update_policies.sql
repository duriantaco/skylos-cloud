ALTER TABLE "public"."finding_suppressions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable update for project members" ON "public"."projects" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "public"."organization_members"
    WHERE organization_members.org_id = projects.org_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for scan members" ON "public"."scans" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "public"."projects"
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE projects.id = scans.project_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable read for project members" ON "public"."finding_suppressions" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "public"."projects"
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE projects.id = finding_suppressions.project_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert for project members" ON "public"."finding_suppressions" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."projects"
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE projects.id = finding_suppressions.project_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for project members" ON "public"."finding_suppressions" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "public"."projects"
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE projects.id = finding_suppressions.project_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for finding members" ON "public"."findings" 
FOR UPDATE USING (
  scan_id IN (
    SELECT scans.id FROM "public"."scans"
    JOIN "public"."projects" ON scans.project_id = projects.id
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE organization_members.user_id = auth.uid()
  )
);

ALTER TABLE scans ADD COLUMN IF NOT EXISTS diff_context jsonb;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS tool text NOT NULL DEFAULT 'skylos';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS new_reason text;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS tool_rule_id text;

ALTER TABLE finding_suppressions ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id);