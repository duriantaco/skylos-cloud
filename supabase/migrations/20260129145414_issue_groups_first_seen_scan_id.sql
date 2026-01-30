alter table public.issue_groups
add column if not exists first_seen_scan_id uuid;

create unique index if not exists issue_groups_org_project_fingerprint_uq
on public.issue_groups (org_id, project_id, fingerprint);
