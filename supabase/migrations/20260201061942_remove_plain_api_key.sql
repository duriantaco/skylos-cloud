ALTER TABLE projects ALTER COLUMN api_key_hash SET NOT NULL;

ALTER TABLE projects DROP COLUMN api_key;