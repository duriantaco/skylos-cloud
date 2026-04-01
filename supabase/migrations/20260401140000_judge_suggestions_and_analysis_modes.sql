alter table public.judge_repo_snapshots
  add column if not exists analysis_kind text not null default 'static';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'judge_repo_snapshots_repo_commit_scoring_key'
  ) then
    alter table public.judge_repo_snapshots
      drop constraint judge_repo_snapshots_repo_commit_scoring_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'judge_repo_snapshots_analysis_kind_check'
  ) then
    alter table public.judge_repo_snapshots
      add constraint judge_repo_snapshots_analysis_kind_check
      check (analysis_kind in ('static', 'agent'));
  end if;
end $$;

create unique index if not exists judge_repo_snapshots_repo_commit_scoring_kind_uq
  on public.judge_repo_snapshots (repo_id, commit_sha, scoring_version, analysis_kind);

alter table public.judge_jobs
  add column if not exists requested_analysis_modes jsonb not null default '["static"]'::jsonb,
  add column if not exists static_status text not null default 'pending',
  add column if not exists agent_status text not null default 'not_requested',
  add column if not exists static_snapshot_id uuid references public.judge_repo_snapshots(id) on delete set null,
  add column if not exists agent_snapshot_id uuid references public.judge_repo_snapshots(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'judge_jobs_static_status_check'
  ) then
    alter table public.judge_jobs
      add constraint judge_jobs_static_status_check
      check (static_status in ('not_requested', 'pending', 'running', 'succeeded', 'failed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'judge_jobs_agent_status_check'
  ) then
    alter table public.judge_jobs
      add constraint judge_jobs_agent_status_check
      check (agent_status in ('not_requested', 'pending', 'running', 'succeeded', 'failed'));
  end if;
end $$;

create table if not exists public.judge_suggestions (
  id uuid primary key default gen_random_uuid(),
  host text not null default 'github',
  owner text not null,
  name text not null,
  source_url text not null,
  contact_email text,
  notes text,
  requested_analysis_modes jsonb not null default '["static","agent"]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'queued', 'rejected', 'duplicate')),
  submitted_by text not null default 'public',
  source_ip text,
  user_agent text,
  repo_id uuid references public.judge_repos(id) on delete set null,
  job_id uuid references public.judge_jobs(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists judge_suggestions_status_created_idx
  on public.judge_suggestions (status, created_at desc);

create index if not exists judge_suggestions_repo_lookup_idx
  on public.judge_suggestions (host, owner, name, created_at desc);

drop trigger if exists trg_judge_suggestions_updated_at on public.judge_suggestions;

create trigger trg_judge_suggestions_updated_at
before update on public.judge_suggestions
for each row
execute function update_updated_at_column();
