ALTER TABLE organizations 
ALTER COLUMN plan SET DEFAULT 'pro';

UPDATE organizations SET plan = 'pro' WHERE plan = 'free' OR plan IS NULL;