ALTER TABLE "public"."finding_suppressions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."findings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for project members" ON "public"."finding_suppressions";
DROP POLICY IF EXISTS "Enable insert for project members" ON "public"."finding_suppressions";
DROP POLICY IF EXISTS "Enable update for project members" ON "public"."finding_suppressions";
DROP POLICY IF EXISTS "Enable delete for project members" ON "public"."finding_suppressions";
DROP POLICY IF EXISTS "Enable update for project members" ON "public"."projects";

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

CREATE POLICY "Enable delete for project members" ON "public"."finding_suppressions" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM "public"."projects"
    JOIN "public"."organization_members" ON projects.org_id = organization_members.org_id
    WHERE projects.id = finding_suppressions.project_id 
    AND organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for project members" ON "public"."projects" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "public"."organization_members"
    WHERE organization_members.org_id = projects.org_id 
    AND organization_members.user_id = auth.uid()
  )
);

ALTER TABLE "public"."finding_suppressions" ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id);
ALTER TABLE "public"."scans" ADD COLUMN IF NOT EXISTS diff_context jsonb;
ALTER TABLE "public"."scans" ADD COLUMN IF NOT EXISTS tool text DEFAULT 'skylos';
ALTER TABLE "public"."findings" ADD COLUMN IF NOT EXISTS new_reason text;
ALTER TABLE "public"."findings" ADD COLUMN IF NOT EXISTS tool_rule_id text;