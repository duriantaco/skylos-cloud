alter table public.policy_exception_requests
  add column if not exists expires_at timestamptz;

alter table public.finding_suppressions
  add column if not exists exception_request_id uuid references public.policy_exception_requests(id) on delete set null,
  add column if not exists manual_reason text,
  add column if not exists manual_created_by uuid references auth.users(id),
  add column if not exists manual_created_at timestamptz,
  add column if not exists manual_expires_at timestamptz,
  add column if not exists manual_revoked_at timestamptz,
  add column if not exists manual_revoked_by uuid references auth.users(id),
  add column if not exists exception_reason text,
  add column if not exists exception_created_by uuid references auth.users(id),
  add column if not exists exception_created_at timestamptz,
  add column if not exists exception_expires_at timestamptz,
  add column if not exists exception_revoked_at timestamptz,
  add column if not exists exception_revoked_by uuid references auth.users(id);

create table if not exists public.exception_request_suppression_links (
  id uuid primary key default gen_random_uuid(),
  exception_request_id uuid not null references public.policy_exception_requests(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  issue_group_id uuid not null references public.issue_groups(id) on delete cascade,
  suppression_id uuid references public.finding_suppressions(id) on delete set null,
  rule_id text not null,
  file_path text not null,
  line_number integer not null default 0,
  state text not null default 'active' check (state in ('active', 'revoked', 'expired')),
  materialized_at timestamptz not null default now(),
  terminal_at timestamptz,
  created_at timestamptz not null default now(),
  unique (exception_request_id, rule_id, file_path, line_number)
);

create index if not exists idx_exception_requests_status_expiry
  on public.policy_exception_requests (org_id, status, expires_at);

create index if not exists idx_finding_suppressions_exception_request
  on public.finding_suppressions (exception_request_id)
  where exception_request_id is not null;

create index if not exists idx_exception_request_suppression_links_request
  on public.exception_request_suppression_links (exception_request_id, state);

create index if not exists idx_exception_request_suppression_links_org
  on public.exception_request_suppression_links (org_id, created_at desc);

update public.finding_suppressions
set manual_reason = coalesce(manual_reason, reason),
    manual_created_by = coalesce(manual_created_by, created_by),
    manual_created_at = coalesce(manual_created_at, created_at),
    manual_expires_at = coalesce(manual_expires_at, expires_at),
    manual_revoked_at = coalesce(manual_revoked_at, revoked_at),
    manual_revoked_by = coalesce(manual_revoked_by, revoked_by)
where exception_request_id is null;

update public.finding_suppressions
set exception_reason = coalesce(exception_reason, reason),
    exception_created_by = coalesce(exception_created_by, created_by),
    exception_created_at = coalesce(exception_created_at, created_at),
    exception_expires_at = coalesce(exception_expires_at, expires_at),
    exception_revoked_at = coalesce(exception_revoked_at, revoked_at),
    exception_revoked_by = coalesce(exception_revoked_by, revoked_by)
where exception_request_id is not null;

insert into public.exception_request_suppression_links (
  exception_request_id,
  org_id,
  project_id,
  issue_group_id,
  suppression_id,
  rule_id,
  file_path,
  line_number,
  state,
  materialized_at,
  terminal_at
)
select
  per.id,
  per.org_id,
  per.project_id,
  per.issue_group_id,
  fs.id,
  fs.rule_id,
  fs.file_path,
  coalesce(fs.line_number, 0),
  case
    when per.status = 'revoked' then 'revoked'
    when per.status = 'expired' then 'expired'
    when terminal_event.event_type = 'revoked' then 'revoked'
    when terminal_event.event_type = 'expired' then 'expired'
    when fs.exception_revoked_at is not null then 'revoked'
    when fs.exception_expires_at is not null and fs.exception_expires_at <= now() then 'expired'
    else 'active'
  end,
  coalesce(fs.exception_created_at, fs.created_at, per.decided_at, per.requested_at, now()),
  case
    when per.status = 'revoked' then coalesce(terminal_event.effective_at, fs.exception_revoked_at)
    when per.status = 'expired' then coalesce(
      terminal_event.effective_at,
      fs.exception_expires_at,
      per.expires_at,
      fs.exception_revoked_at
    )
    when terminal_event.event_type = 'revoked' then terminal_event.effective_at
    when terminal_event.event_type = 'expired' then terminal_event.effective_at
    when fs.exception_revoked_at is not null then fs.exception_revoked_at
    when fs.exception_expires_at is not null and fs.exception_expires_at <= now() then fs.exception_expires_at
    else null
  end
from public.finding_suppressions fs
join public.policy_exception_requests per
  on per.id = fs.exception_request_id
left join lateral (
  select
    ee.event_type,
    coalesce(
      nullif(ee.payload->>'effective_at', '')::timestamptz,
      ee.created_at
    ) as effective_at
  from public.exception_events ee
  where ee.exception_request_id = per.id
    and ee.event_type in ('revoked', 'expired')
  order by coalesce(
    nullif(ee.payload->>'effective_at', '')::timestamptz,
    ee.created_at
  ) desc, ee.created_at desc
  limit 1
) terminal_event on true
on conflict (exception_request_id, rule_id, file_path, line_number) do nothing;

create or replace function public.suppression_slot_active(
  p_present boolean,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
as $$
  select coalesce(p_present, false)
    and p_revoked_at is null
    and (p_expires_at is null or p_expires_at > p_now);
$$;

create or replace function public.suppression_slot_terminal_at(
  p_present boolean,
  p_expires_at timestamptz,
  p_revoked_at timestamptz,
  p_now timestamptz default now()
)
returns timestamptz
language sql
stable
as $$
  select case
    when not coalesce(p_present, false) then null
    when p_revoked_at is not null then p_revoked_at
    when p_expires_at is not null and p_expires_at <= p_now then p_expires_at
    else null
  end;
$$;

create or replace function public.sync_finding_suppression_effective_fields()
returns trigger
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_manual_present boolean;
  v_exception_present boolean;
  v_manual_active boolean;
  v_exception_active boolean;
  v_manual_terminal_at timestamptz;
  v_exception_terminal_at timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.exception_request_id is null
      and new.manual_reason is null
      and new.manual_created_by is null
      and new.manual_created_at is null
      and new.manual_expires_at is null
      and new.manual_revoked_at is null
      and new.manual_revoked_by is null
      and new.exception_reason is null
      and new.exception_created_by is null
      and new.exception_created_at is null
      and new.exception_expires_at is null
      and new.exception_revoked_at is null
      and new.exception_revoked_by is null then
      new.manual_reason := coalesce(new.reason, new.manual_reason);
      new.manual_created_by := coalesce(new.created_by, new.manual_created_by);
      new.manual_created_at := coalesce(new.created_at, new.manual_created_at, v_now);
      new.manual_expires_at := coalesce(new.manual_expires_at, new.expires_at);
      new.manual_revoked_at := coalesce(new.manual_revoked_at, new.revoked_at);
      new.manual_revoked_by := coalesce(new.manual_revoked_by, new.revoked_by);
    end if;
  else
    if (
      new.reason is distinct from old.reason
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at
      or new.expires_at is distinct from old.expires_at
      or new.revoked_at is distinct from old.revoked_at
      or new.revoked_by is distinct from old.revoked_by
    ) and new.manual_reason is not distinct from old.manual_reason
      and new.manual_created_by is not distinct from old.manual_created_by
      and new.manual_created_at is not distinct from old.manual_created_at
      and new.manual_expires_at is not distinct from old.manual_expires_at
      and new.manual_revoked_at is not distinct from old.manual_revoked_at
      and new.manual_revoked_by is not distinct from old.manual_revoked_by
      and new.exception_request_id is not distinct from old.exception_request_id
      and new.exception_reason is not distinct from old.exception_reason
      and new.exception_created_by is not distinct from old.exception_created_by
      and new.exception_created_at is not distinct from old.exception_created_at
      and new.exception_expires_at is not distinct from old.exception_expires_at
      and new.exception_revoked_at is not distinct from old.exception_revoked_at
      and new.exception_revoked_by is not distinct from old.exception_revoked_by then
      new.manual_reason := new.reason;
      new.manual_created_by := new.created_by;
      new.manual_created_at := coalesce(old.manual_created_at, new.created_at, v_now);
      new.manual_expires_at := new.expires_at;
      new.manual_revoked_at := new.revoked_at;
      new.manual_revoked_by := new.revoked_by;
    end if;
  end if;

  v_manual_present := new.manual_reason is not null
    or new.manual_created_by is not null
    or new.manual_created_at is not null
    or new.manual_expires_at is not null
    or new.manual_revoked_at is not null
    or new.manual_revoked_by is not null;

  v_exception_present := new.exception_request_id is not null
    or new.exception_reason is not null
    or new.exception_created_by is not null
    or new.exception_created_at is not null
    or new.exception_expires_at is not null
    or new.exception_revoked_at is not null
    or new.exception_revoked_by is not null;

  v_manual_active := public.suppression_slot_active(
    v_manual_present,
    new.manual_expires_at,
    new.manual_revoked_at,
    v_now
  );
  v_exception_active := public.suppression_slot_active(
    v_exception_present,
    new.exception_expires_at,
    new.exception_revoked_at,
    v_now
  );

  v_manual_terminal_at := public.suppression_slot_terminal_at(
    v_manual_present,
    new.manual_expires_at,
    new.manual_revoked_at,
    v_now
  );
  v_exception_terminal_at := public.suppression_slot_terminal_at(
    v_exception_present,
    new.exception_expires_at,
    new.exception_revoked_at,
    v_now
  );

  if v_manual_active or v_exception_active then
    new.revoked_at := null;
    new.revoked_by := null;
    new.expires_at := case
      when v_manual_active and v_exception_active then
        case
          when new.manual_expires_at is null or new.exception_expires_at is null then null
          else greatest(new.manual_expires_at, new.exception_expires_at)
        end
      when v_manual_active then new.manual_expires_at
      else new.exception_expires_at
    end;

    if v_manual_active then
      new.reason := coalesce(new.manual_reason, new.reason);
      new.created_by := coalesce(new.manual_created_by, new.created_by);
      new.created_at := coalesce(new.manual_created_at, new.created_at, v_now);
    else
      new.reason := coalesce(new.exception_reason, new.reason);
      new.created_by := coalesce(new.exception_created_by, new.created_by);
      new.created_at := coalesce(new.exception_created_at, new.created_at, v_now);
    end if;
  else
    new.expires_at := case
      when v_manual_present and v_exception_present then
        case
          when new.manual_expires_at is null then new.exception_expires_at
          when new.exception_expires_at is null then new.manual_expires_at
          else greatest(new.manual_expires_at, new.exception_expires_at)
        end
      when v_manual_present then new.manual_expires_at
      when v_exception_present then new.exception_expires_at
      else new.expires_at
    end;

    new.revoked_at := case
      when v_manual_terminal_at is null then v_exception_terminal_at
      when v_exception_terminal_at is null then v_manual_terminal_at
      else greatest(v_manual_terminal_at, v_exception_terminal_at)
    end;

    new.revoked_by := case
      when v_exception_terminal_at is not null
        and (v_manual_terminal_at is null or v_exception_terminal_at >= v_manual_terminal_at)
        then new.exception_revoked_by
      when v_manual_terminal_at is not null then new.manual_revoked_by
      else new.revoked_by
    end;

    if v_manual_present then
      new.reason := coalesce(new.manual_reason, new.reason);
      new.created_by := coalesce(new.manual_created_by, new.created_by);
      new.created_at := coalesce(new.manual_created_at, new.created_at, v_now);
    elsif v_exception_present then
      new.reason := coalesce(new.exception_reason, new.reason);
      new.created_by := coalesce(new.exception_created_by, new.created_by);
      new.created_at := coalesce(new.exception_created_at, new.created_at, v_now);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_finding_suppression_effective_fields
  on public.finding_suppressions;

create trigger trg_sync_finding_suppression_effective_fields
before insert or update on public.finding_suppressions
for each row
execute function public.sync_finding_suppression_effective_fields();

update public.finding_suppressions
set reason = reason;

create or replace function public.refresh_issue_group_exception_state(
  p_project_id uuid,
  p_issue_group_id uuid,
  p_now timestamptz default now()
)
returns text
language plpgsql
as $$
declare
  v_next_status text;
begin
  update public.findings f
  set is_suppressed = exists (
    select 1
    from public.finding_suppressions fs
    where fs.project_id = p_project_id
      and fs.rule_id = f.rule_id
      and fs.file_path = f.file_path
      and fs.line_number = coalesce(f.line_number, 0)
      and fs.revoked_at is null
      and (fs.expires_at is null or fs.expires_at > p_now)
  )
  where f.group_id = p_issue_group_id;

  if exists (
    select 1
    from public.policy_exception_requests per
    where per.issue_group_id = p_issue_group_id
      and per.status = 'requested'
  ) then
    v_next_status := 'pending_exception';
  elsif exists (
    select 1
    from public.policy_exception_requests per
    where per.issue_group_id = p_issue_group_id
      and per.status = 'approved'
      and (per.expires_at is null or per.expires_at > p_now)
  ) then
    v_next_status := 'suppressed';
  elsif exists (
    select 1
    from public.findings f
    where f.group_id = p_issue_group_id
      and f.is_suppressed = true
  ) then
    v_next_status := 'suppressed';
  else
    v_next_status := 'open';
  end if;

  update public.issue_groups
  set status = v_next_status
  where id = p_issue_group_id;

  return v_next_status;
end;
$$;

create or replace function public.review_exception_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_review_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.policy_exception_requests%rowtype;
  v_now timestamptz := now();
  v_issue_group_status text;
  v_decision text := lower(coalesce(p_decision, ''));
begin
  if auth.uid() is null or auth.uid() is distinct from p_reviewer_id then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  if v_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_decision');
  end if;

  select *
  into v_request
  from public.policy_exception_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'not_found');
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_request.org_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'owner')
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  if v_request.requested_by = p_reviewer_id then
    return jsonb_build_object('ok', false, 'error_code', 'self_review');
  end if;

  if v_request.status <> 'requested' then
    return jsonb_build_object(
      'ok',
      false,
      'error_code',
      'invalid_state',
      'status',
      v_request.status
    );
  end if;

  if v_request.expires_at is not null and v_request.expires_at <= v_now then
    update public.policy_exception_requests
    set status = 'expired'
    where id = v_request.id
      and status = 'requested';

    insert into public.exception_events (
      exception_request_id,
      org_id,
      issue_group_id,
      actor_id,
      event_type,
      payload
    )
    values (
      v_request.id,
      v_request.org_id,
      v_request.issue_group_id,
      coalesce(v_request.reviewed_by, v_request.requested_by, p_reviewer_id),
      'expired',
      jsonb_build_object(
        'automation',
        'expiry_enforcement',
        'previous_status',
        'requested',
        'effective_at',
        v_request.expires_at,
        'expiry_reason',
        'Exception request expired before review'
      )
    );

    v_issue_group_status := public.refresh_issue_group_exception_state(
      v_request.project_id,
      v_request.issue_group_id,
      v_now
    );

    return jsonb_build_object(
      'ok',
      false,
      'error_code',
      'expired',
      'status',
      'expired',
      'issue_group_status',
      v_issue_group_status
    );
  end if;

  update public.policy_exception_requests
  set status = case when v_decision = 'approve' then 'approved' else 'rejected' end,
      reviewed_by = p_reviewer_id,
      review_reason = p_review_reason,
      decided_at = v_now
  where id = v_request.id
    and status = 'requested';

  insert into public.exception_events (
    exception_request_id,
    org_id,
    issue_group_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_request.id,
    v_request.org_id,
    v_request.issue_group_id,
    p_reviewer_id,
    case when v_decision = 'approve' then 'approved' else 'rejected' end,
    jsonb_build_object(
      'review_reason',
      p_review_reason,
      'expires_at',
      v_request.expires_at
    )
  );

  if v_decision = 'approve' then
    with upserted as (
      insert into public.finding_suppressions (
        project_id,
        rule_id,
        file_path,
        line_number,
        reason,
        created_by,
        created_at,
        expires_at,
        revoked_at,
        revoked_by,
        exception_request_id,
        exception_reason,
        exception_created_by,
        exception_created_at,
        exception_expires_at,
        exception_revoked_at,
        exception_revoked_by
      )
      select distinct
        v_request.project_id,
        f.rule_id,
        f.file_path,
        coalesce(f.line_number, 0),
        v_request.justification,
        p_reviewer_id,
        v_now,
        v_request.expires_at,
        null,
        null,
        v_request.id,
        v_request.justification,
        p_reviewer_id,
        v_now,
        v_request.expires_at,
        null,
        null
      from public.findings f
      where f.group_id = v_request.issue_group_id
      on conflict (project_id, rule_id, file_path, line_number) do update
      set exception_request_id = excluded.exception_request_id,
          exception_reason = excluded.exception_reason,
          exception_created_by = excluded.exception_created_by,
          exception_created_at = excluded.exception_created_at,
          exception_expires_at = excluded.exception_expires_at,
          exception_revoked_at = null,
          exception_revoked_by = null,
          manual_reason = coalesce(
            public.finding_suppressions.manual_reason,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.reason
              else null
            end
          ),
          manual_created_by = coalesce(
            public.finding_suppressions.manual_created_by,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.created_by
              else null
            end
          ),
          manual_created_at = coalesce(
            public.finding_suppressions.manual_created_at,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.created_at
              else null
            end
          ),
          manual_expires_at = coalesce(
            public.finding_suppressions.manual_expires_at,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.expires_at
              else null
            end
          ),
          manual_revoked_at = coalesce(
            public.finding_suppressions.manual_revoked_at,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.revoked_at
              else null
            end
          ),
          manual_revoked_by = coalesce(
            public.finding_suppressions.manual_revoked_by,
            case
              when public.finding_suppressions.exception_request_id is null
                then public.finding_suppressions.revoked_by
              else null
            end
          )
      returning id, rule_id, file_path, line_number
    )
    insert into public.exception_request_suppression_links (
      exception_request_id,
      org_id,
      project_id,
      issue_group_id,
      suppression_id,
      rule_id,
      file_path,
      line_number,
      state,
      materialized_at,
      terminal_at
    )
    select
      v_request.id,
      v_request.org_id,
      v_request.project_id,
      v_request.issue_group_id,
      u.id,
      u.rule_id,
      u.file_path,
      u.line_number,
      'active',
      v_now,
      null
    from upserted u
    on conflict (exception_request_id, rule_id, file_path, line_number) do update
    set suppression_id = excluded.suppression_id,
        state = 'active',
        materialized_at = excluded.materialized_at,
        terminal_at = null;

    update public.findings
    set is_suppressed = true
    where group_id = v_request.issue_group_id;
  end if;

  v_issue_group_status := public.refresh_issue_group_exception_state(
    v_request.project_id,
    v_request.issue_group_id,
    v_now
  );

  return jsonb_build_object(
    'ok',
    true,
    'status',
    case when v_decision = 'approve' then 'approved' else 'rejected' end,
    'issue_group_status',
    v_issue_group_status
  );
end;
$$;

create or replace function public.revoke_exception_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_revoke_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.policy_exception_requests%rowtype;
  v_now timestamptz := now();
  v_effective_at timestamptz;
  v_issue_group_status text;
begin
  if auth.uid() is null or auth.uid() is distinct from p_reviewer_id then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  select *
  into v_request
  from public.policy_exception_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'not_found');
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_request.org_id
      and om.user_id = auth.uid()
      and om.role in ('admin', 'owner')
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  if v_request.status <> 'approved' then
    return jsonb_build_object(
      'ok',
      false,
      'error_code',
      'invalid_state',
      'status',
      v_request.status
    );
  end if;

  if v_request.expires_at is not null and v_request.expires_at <= v_now then
    v_effective_at := v_request.expires_at;

    update public.policy_exception_requests
    set status = 'expired'
    where id = v_request.id
      and status = 'approved';

    insert into public.exception_events (
      exception_request_id,
      org_id,
      issue_group_id,
      actor_id,
      event_type,
      payload
    )
    values (
      v_request.id,
      v_request.org_id,
      v_request.issue_group_id,
      coalesce(v_request.reviewed_by, v_request.requested_by, p_reviewer_id),
      'expired',
      jsonb_build_object(
        'automation',
        'expiry_enforcement',
        'previous_status',
        'approved',
        'effective_at',
        v_effective_at,
        'expiry_reason',
        'Approved exception reached its expiry time'
      )
    );

    update public.finding_suppressions
    set exception_revoked_at = coalesce(exception_revoked_at, v_effective_at),
        exception_revoked_by = null
    where exception_request_id = v_request.id
      and exception_revoked_at is null;

    update public.exception_request_suppression_links
    set state = 'expired',
        terminal_at = coalesce(terminal_at, v_effective_at)
    where exception_request_id = v_request.id
      and state = 'active';

    v_issue_group_status := public.refresh_issue_group_exception_state(
      v_request.project_id,
      v_request.issue_group_id,
      v_now
    );

    return jsonb_build_object(
      'ok',
      false,
      'error_code',
      'expired',
      'status',
      'expired',
      'issue_group_status',
      v_issue_group_status
    );
  end if;

  update public.policy_exception_requests
  set status = 'revoked'
  where id = v_request.id
    and status = 'approved';

  insert into public.exception_events (
    exception_request_id,
    org_id,
    issue_group_id,
    actor_id,
    event_type,
    payload
  )
  values (
    v_request.id,
    v_request.org_id,
    v_request.issue_group_id,
    p_reviewer_id,
    'revoked',
    jsonb_build_object('revoke_reason', p_revoke_reason)
  );

  update public.finding_suppressions
  set exception_revoked_at = v_now,
      exception_revoked_by = p_reviewer_id
  where exception_request_id = v_request.id
    and exception_revoked_at is null;

  update public.exception_request_suppression_links
  set state = 'revoked',
      terminal_at = coalesce(terminal_at, v_now)
  where exception_request_id = v_request.id
    and state = 'active';

  v_issue_group_status := public.refresh_issue_group_exception_state(
    v_request.project_id,
    v_request.issue_group_id,
    v_now
  );

  return jsonb_build_object(
    'ok',
    true,
    'status',
    'revoked',
    'issue_group_status',
    v_issue_group_status
  );
end;
$$;

create or replace function public.sync_expired_exception_requests(
  p_org_id uuid default null,
  p_request_id uuid default null,
  p_issue_group_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.policy_exception_requests%rowtype;
  v_org_id uuid := p_org_id;
  v_effective_at timestamptz;
  v_expired_count integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  if v_org_id is null and p_request_id is not null then
    select org_id
    into v_org_id
    from public.policy_exception_requests
    where id = p_request_id;
  end if;

  if v_org_id is null then
    return jsonb_build_object('ok', false, 'error_code', 'missing_org');
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.org_id = v_org_id
      and om.user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'forbidden');
  end if;

  for v_request in
    select *
    from public.policy_exception_requests
    where org_id = v_org_id
      and (p_request_id is null or id = p_request_id)
      and (p_issue_group_id is null or issue_group_id = p_issue_group_id)
      and status in ('requested', 'approved')
      and expires_at is not null
      and expires_at <= now()
    order by expires_at asc
    for update
  loop
    update public.policy_exception_requests
    set status = 'expired'
    where id = v_request.id
      and status in ('requested', 'approved');

    if found then
      v_effective_at := coalesce(v_request.expires_at, now());

      insert into public.exception_events (
        exception_request_id,
        org_id,
        issue_group_id,
        actor_id,
        event_type,
        payload
      )
      values (
        v_request.id,
        v_request.org_id,
        v_request.issue_group_id,
        coalesce(v_request.reviewed_by, v_request.requested_by, auth.uid()),
        'expired',
        jsonb_build_object(
          'automation',
          'expiry_enforcement',
          'previous_status',
          v_request.status,
          'effective_at',
          v_effective_at,
          'expiry_reason',
          'Approved exception reached its expiry time'
        )
      );

      if v_request.status = 'approved' then
        update public.finding_suppressions
        set exception_revoked_at = coalesce(exception_revoked_at, v_effective_at),
            exception_revoked_by = null
        where exception_request_id = v_request.id
          and exception_revoked_at is null;

        update public.exception_request_suppression_links
        set state = 'expired',
            terminal_at = coalesce(terminal_at, v_effective_at)
        where exception_request_id = v_request.id
          and state = 'active';
      end if;

      perform public.refresh_issue_group_exception_state(
        v_request.project_id,
        v_request.issue_group_id,
        now()
      );

      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'expired_count', v_expired_count);
end;
$$;

alter table public.exception_request_suppression_links enable row level security;

drop policy if exists "Users can read exception suppression links in their org"
  on public.exception_request_suppression_links;

create policy "Users can read exception suppression links in their org"
  on public.exception_request_suppression_links for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.org_id = exception_request_suppression_links.org_id
        and om.user_id = auth.uid()
    )
  );
