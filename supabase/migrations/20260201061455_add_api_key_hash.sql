ALTER TABLE projects ADD COLUMN api_key_hash TEXT;

CREATE INDEX idx_projects_api_key_hash ON projects(api_key_hash);

UPDATE projects 
SET api_key_hash = encode(sha256(api_key::bytea), 'hex') 
WHERE api_key IS NOT NULL;

-- Make api_key_hash NOT NULL after populating (optional but recommended)
-- ALTER TABLE projects ALTER COLUMN api_key_hash SET NOT NULL;