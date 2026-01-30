alter table public.issue_groups
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.issue_groups
  add column if not exists last_seen_scan_id uuid references public.scans(id) on delete set null;


update public.issue_groups ig
set project_id = t.project_id
from (
  select 
    f.group_id as issue_group_id, 
    max(s.project_id::text)::uuid as project_id 
  from findings f
  join scans s on f.scan_id = s.id
  group by f.group_id
) t
where ig.id = t.issue_group_id;

do $$
declare
  c_name text;
begin
  select conname into c_name
  from pg_constraint
  where conrelid = 'public.issue_groups'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like '%(org_id, fingerprint)%'
  limit 1;

  if c_name is not null then
    execute format('alter table public.issue_groups drop constraint %I', c_name);
  end if;
end $$;

alter table public.issue_groups
  add constraint issue_groups_org_project_fingerprint_uniq
  unique (org_id, project_id, fingerprint);

create index if not exists issue_groups_org_project_idx
on public.issue_groups (org_id, project_id);

create index if not exists issue_groups_open_idx
on public.issue_groups (org_id, project_id, status, severity);

create index if not exists issue_groups_last_seen_scan_id_idx
on public.issue_groups (last_seen_scan_id);
