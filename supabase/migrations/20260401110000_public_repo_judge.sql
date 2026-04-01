create table if not exists public.judge_repos (
  id uuid primary key default gen_random_uuid(),
  host text not null default 'github',
  owner text not null,
  name text not null,
  source_url text not null,
  default_branch text,
  language text,
  is_active boolean not null default true,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint judge_repos_host_owner_name_key unique (host, owner, name)
);

create table if not exists public.judge_repo_snapshots (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.judge_repos(id) on delete cascade,
  commit_sha text not null,
  branch text,
  scanned_at timestamptz not null default now(),
  ingest_source text not null default 'manual',
  status text not null default 'ready'
    check (status in ('ready', 'unsupported')),
  skylos_version text,
  scoring_version text not null,
  analysis_mode text,
  overall_score integer not null check (overall_score between 0 and 100),
  grade text not null,
  security_score integer not null check (security_score between 0 and 100),
  quality_score integer not null check (quality_score between 0 and 100),
  dead_code_score integer not null check (dead_code_score between 0 and 100),
  confidence_score integer not null check (confidence_score between 0 and 100),
  summary jsonb not null default '{}'::jsonb,
  top_findings jsonb not null default '[]'::jsonb,
  fairness_notes jsonb not null default '[]'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  constraint judge_repo_snapshots_repo_commit_scoring_key unique (repo_id, commit_sha, scoring_version)
);

create table if not exists public.judge_jobs (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid not null references public.judge_repos(id) on delete cascade,
  target_ref text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed')),
  requested_by text not null default 'seed',
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  snapshot_id uuid references public.judge_repo_snapshots(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists judge_repos_active_last_scanned_idx
  on public.judge_repos (is_active, last_scanned_at desc nulls last);

create index if not exists judge_repo_snapshots_repo_scanned_idx
  on public.judge_repo_snapshots (repo_id, scanned_at desc);

create index if not exists judge_jobs_repo_status_requested_idx
  on public.judge_jobs (repo_id, status, requested_at desc);

create trigger trg_judge_repos_updated_at
before update on public.judge_repos
for each row
execute function update_updated_at_column();
