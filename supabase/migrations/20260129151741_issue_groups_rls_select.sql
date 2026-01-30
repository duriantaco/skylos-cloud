alter table public.issue_groups enable row level security;

drop policy if exists issue_groups_select_org_members on public.issue_groups;
drop policy if exists issue_groups_read on public.issue_groups;
drop policy if exists "issue_groups_select_org_members" on public.issue_groups;
drop policy if exists "issue_groups_read" on public.issue_groups;

create policy issue_groups_select_org_members
on public.issue_groups
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members m
    where m.org_id = issue_groups.org_id
      and m.user_id = auth.uid()
  )
);
