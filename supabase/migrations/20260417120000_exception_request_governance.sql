create table if not exists public.policy_exception_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_group_id uuid not null references public.issue_groups(id) on delete cascade,
  target_type text not null default 'issue_group' check (target_type in ('issue_group')),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'revoked', 'expired')),
  justification text not null,
  review_reason text,
  scope_summary text,
  snapshot jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_exception_requests_org_status
  on public.policy_exception_requests (org_id, status, requested_at desc);

create index if not exists idx_exception_requests_issue_group
  on public.policy_exception_requests (issue_group_id, requested_at desc);

create unique index if not exists idx_exception_requests_one_pending_per_group
  on public.policy_exception_requests (issue_group_id)
  where status = 'requested';

create table if not exists public.exception_events (
  id uuid primary key default gen_random_uuid(),
  exception_request_id uuid not null references public.policy_exception_requests(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  issue_group_id uuid not null references public.issue_groups(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('requested', 'approved', 'rejected', 'revoked', 'expired')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_exception_events_request
  on public.exception_events (exception_request_id, created_at asc);

alter table public.policy_exception_requests enable row level security;
alter table public.exception_events enable row level security;

create policy "Users can read exception requests in their org"
  on public.policy_exception_requests for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.org_id = policy_exception_requests.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Members can create exception requests in their org"
  on public.policy_exception_requests for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from public.organization_members om
      where om.org_id = policy_exception_requests.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Admins can update exception requests in their org"
  on public.policy_exception_requests for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.org_id = policy_exception_requests.org_id
        and om.user_id = auth.uid()
        and om.role in ('admin', 'owner')
    )
  )
  with check (
    exists (
      select 1
      from public.organization_members om
      where om.org_id = policy_exception_requests.org_id
        and om.user_id = auth.uid()
        and om.role in ('admin', 'owner')
    )
  );

create policy "Users can read exception events in their org"
  on public.exception_events for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.org_id = exception_events.org_id
        and om.user_id = auth.uid()
    )
  );

create policy "Members can insert exception events in their org"
  on public.exception_events for insert
  with check (
    actor_id = auth.uid()
    and exists (
      select 1
      from public.organization_members om
      where om.org_id = exception_events.org_id
        and om.user_id = auth.uid()
    )
  );
