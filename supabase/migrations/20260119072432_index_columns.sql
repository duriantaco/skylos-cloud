create index if not exists projects_org_id_idx
on public.projects (org_id);

create index if not exists organization_members_user_id_idx
on public.organization_members (user_id);
