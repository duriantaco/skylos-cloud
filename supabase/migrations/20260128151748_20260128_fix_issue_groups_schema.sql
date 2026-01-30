alter table public.issue_groups
  add column if not exists project_id uuid references public.projects(id);

alter table public.issue_groups
  add column if not exists last_seen_scan_id uuid references public.scans(id);

create index if not exists issue_groups_org_status_sev_idx
  on public.issue_groups (org_id, status, severity);

create index if not exists issue_groups_last_seen_scan_idx
  on public.issue_groups (last_seen_scan_id);

create index if not exists issue_groups_project_idx
  on public.issue_groups (project_id);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'issue_groups_org_id_fingerprint_key'
  ) then
    alter table public.issue_groups
      drop constraint issue_groups_org_id_fingerprint_key;
  end if;
exception when undefined_object then
end $$;

alter table public.issue_groups
  add constraint issue_groups_org_project_fingerprint_key
  unique (org_id, project_id, fingerprint);
