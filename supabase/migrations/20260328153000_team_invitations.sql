CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS team_invitations_org_id_created_at_idx
  ON public.team_invitations (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS team_invitations_org_id_email_idx
  ON public.team_invitations (org_id, lower(email));

CREATE INDEX IF NOT EXISTS team_invitations_token_idx
  ON public.team_invitations (token);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
