create table if not exists public.issue_groups (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null,
  project_id uuid not null,

  fingerprint text not null,

  rule_id text,
  category text,
  severity text,

  status text not null default 'open',                 
  verification_status text default 'UNVERIFIED',

  canonical_file text,
  canonical_line int,
  canonical_snippet text,

  occurrence_count int not null default 0,
  affected_files text[] not null default '{}',

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_seen_scan_id uuid,
  last_seen_scan_id uuid,

  suggested_fix jsonb,
  data_flow jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists issue_groups_unique
  on public.issue_groups (org_id, project_id, fingerprint);

create index if not exists issue_groups_open_last_seen
  on public.issue_groups (org_id, status, last_seen_at desc);

create index if not exists issue_groups_scan
  on public.issue_groups (org_id, last_seen_scan_id);

alter table public.findings
  add column if not exists group_id uuid;

create index if not exists findings_group_id_idx
  on public.findings (group_id);