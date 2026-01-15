create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  org_id uuid references organizations(id),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_events_type_date on analytics_events(event_type, created_at);
create index idx_events_org on analytics_events(org_id);