create table if not exists public.verify_usage_daily (
  owner_id uuid not null,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, day)
);

comment on table public.verify_usage_daily is
'Daily usage counter for Skylos Verify endpoint. Keyed by owner_id (org_id preferred, project_id fallback). UTC day.';

comment on column public.verify_usage_daily.owner_id is
'UUID that identifies the rate-limit owner (org_id preferred, otherwise project_id).';

comment on column public.verify_usage_daily.day is
'UTC day for the usage window.';

comment on column public.verify_usage_daily.count is
'Number of verify requests recorded for this owner/day.';

-- Atomic bump function: increments counter and returns whether request is allowed
create or replace function public.bump_verify_usage_daily(
  p_owner_id uuid,
  p_limit integer
)
returns table(allowed boolean, new_count integer)
language plpgsql
as $$
declare
  today date := (now() at time zone 'utc')::date;
  c integer;
begin
  -- Ensure row exists
  insert into public.verify_usage_daily(owner_id, day, count)
  values (p_owner_id, today, 0)
  on conflict (owner_id, day) do nothing;

  -- Atomic increment
  update public.verify_usage_daily
  set count = count + 1,
      updated_at = now()
  where owner_id = p_owner_id
    and day = today
  returning count into c;

  return query
  select (c <= p_limit) as allowed, c as new_count;
end;
$$;

comment on function public.bump_verify_usage_daily(uuid, integer) is
'Atomically increments verify usage for (owner_id, UTC day) and returns allowed/new_count against p_limit.';
