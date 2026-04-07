CREATE TABLE IF NOT EXISTS public.project_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  label TEXT,
  role TEXT NOT NULL DEFAULT 'secondary' CHECK (role IN ('primary', 'secondary')),
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS project_api_keys_key_hash_unique
  ON public.project_api_keys (key_hash);

CREATE UNIQUE INDEX IF NOT EXISTS project_api_keys_one_active_primary_per_project
  ON public.project_api_keys (project_id)
  WHERE role = 'primary' AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS project_api_keys_project_active_idx
  ON public.project_api_keys (project_id, revoked_at);

INSERT INTO public.project_api_keys (project_id, key_hash, label, role, source)
SELECT
  p.id,
  p.api_key_hash,
  'Primary API key',
  'primary',
  'legacy'
FROM public.projects p
WHERE p.api_key_hash IS NOT NULL
ON CONFLICT (key_hash) DO NOTHING;

ALTER TABLE public.project_api_keys ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.project_api_keys TO authenticated;
GRANT ALL ON TABLE public.project_api_keys TO service_role;
