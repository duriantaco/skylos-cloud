CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_group_id UUID NOT NULL REFERENCES issue_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issue_comments_group ON issue_comments(issue_group_id, created_at DESC);
CREATE INDEX idx_issue_comments_user ON issue_comments(user_id, created_at DESC);
CREATE INDEX idx_issue_comments_mentions ON issue_comments USING GIN(mentioned_user_ids);
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'resolved', 'unassigned');

CREATE TABLE IF NOT EXISTS issue_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_group_id UUID NOT NULL REFERENCES issue_groups(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status assignment_status DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(issue_group_id)
);

CREATE INDEX idx_issue_assignments_user ON issue_assignments(assigned_to, status, assigned_at DESC);
CREATE INDEX idx_issue_assignments_status ON issue_assignments(status, assigned_at DESC);
CREATE TYPE activity_type AS ENUM (
  'comment',
  'assignment',
  'resolution',
  'suppression',
  'false_positive',
  'status_change'
);

CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_activity_org ON team_activity_log(org_id, created_at DESC);
CREATE INDEX idx_team_activity_user ON team_activity_log(user_id, created_at DESC);
CREATE INDEX idx_team_activity_entity ON team_activity_log(entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issue_comments_updated_at
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issue_assignments_updated_at
  BEFORE UPDATE ON issue_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read comments in their org"
  ON issue_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issue_groups ig
      JOIN projects p ON ig.project_id = p.id
      JOIN organization_members om ON p.org_id = om.org_id
      WHERE ig.id = issue_comments.issue_group_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments in their org"
  ON issue_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM issue_groups ig
      JOIN projects p ON ig.project_id = p.id
      JOIN organization_members om ON p.org_id = om.org_id
      WHERE ig.id = issue_comments.issue_group_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON issue_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON issue_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can read assignments in their org"
  ON issue_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issue_groups ig
      JOIN projects p ON ig.project_id = p.id
      JOIN organization_members om ON p.org_id = om.org_id
      WHERE ig.id = issue_assignments.issue_group_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage assignments in their org"
  ON issue_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM issue_groups ig
      JOIN projects p ON ig.project_id = p.id
      JOIN organization_members om ON p.org_id = om.org_id
      WHERE ig.id = issue_assignments.issue_group_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    assigned_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM issue_groups ig
      JOIN projects p ON ig.project_id = p.id
      JOIN organization_members om ON p.org_id = om.org_id
      WHERE ig.id = issue_assignments.issue_group_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read activity in their org"
  ON team_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = team_activity_log.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON team_activity_log FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = team_activity_log.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION log_team_activity(
  p_org_id UUID,
  p_user_id UUID,
  p_activity_type activity_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO team_activity_log (
    org_id,
    user_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_org_id,
    p_user_id,
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_metadata
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT p.org_id INTO v_org_id
  FROM issue_groups ig
  JOIN projects p ON ig.project_id = p.id
  WHERE ig.id = NEW.issue_group_id;

  PERFORM log_team_activity(
    v_org_id,
    NEW.user_id,
    'comment',
    'issue_group',
    NEW.issue_group_id,
    jsonb_build_object(
      'comment_id', NEW.id,
      'comment_preview', LEFT(NEW.comment_text, 100)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_comment_activity_trigger
  AFTER INSERT ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_activity();

CREATE OR REPLACE FUNCTION log_assignment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_activity activity_type;
BEGIN
  SELECT p.org_id INTO v_org_id
  FROM issue_groups ig
  JOIN projects p ON ig.project_id = p.id
  WHERE ig.id = NEW.issue_group_id;

  IF TG_OP = 'INSERT' THEN
    v_activity := 'assignment';
  ELSIF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    v_activity := 'resolution';
  ELSE
    v_activity := 'status_change';
  END IF;

  PERFORM log_team_activity(
    v_org_id,
    NEW.assigned_by,
    v_activity,
    'issue_group',
    NEW.issue_group_id,
    jsonb_build_object(
      'assignment_id', NEW.id,
      'assigned_to', NEW.assigned_to,
      'status', NEW.status,
      'notes', NEW.notes
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_assignment_activity_trigger
  AFTER INSERT OR UPDATE ON issue_assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_assignment_activity();
