ALTER TABLE scans
  ADD COLUMN share_token TEXT UNIQUE,
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_scans_share_token ON scans (share_token) WHERE share_token IS NOT NULL;

CREATE POLICY "public_read_shared_scans" ON scans
  FOR SELECT USING (is_public = true AND share_token IS NOT NULL);
