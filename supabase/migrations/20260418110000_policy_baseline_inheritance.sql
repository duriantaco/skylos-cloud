alter table public.organizations
  add column if not exists policy_config jsonb not null default '{}'::jsonb,
  add column if not exists ai_assurance_enabled boolean not null default false;

alter table public.projects
  add column if not exists policy_inheritance_mode text not null default 'inherit';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_policy_inheritance_mode_check'
  ) then
    alter table public.projects
      add constraint projects_policy_inheritance_mode_check
      check (policy_inheritance_mode in ('inherit', 'custom'));
  end if;
end $$;

create or replace function pg_temp.policy_safe_array_length(value jsonb)
returns integer
language sql
immutable
as $$
  select case
    when jsonb_typeof(value) = 'array' then jsonb_array_length(value)
    else 0
  end
$$;

create or replace function pg_temp.policy_safe_bool(value text, fallback boolean)
returns boolean
language plpgsql
immutable
as $$
begin
  if value is null then
    return fallback;
  end if;

  case lower(value)
    when 'true' then return true;
    when 'false' then return false;
    else return fallback;
  end case;
exception
  when others then
    return fallback;
end;
$$;

create or replace function pg_temp.policy_safe_int(value text, fallback integer)
returns integer
language plpgsql
immutable
as $$
begin
  if value is null then
    return fallback;
  end if;

  if value ~ '^-?[0-9]+$' then
    return value::integer;
  end if;

  return fallback;
exception
  when others then
    return fallback;
end;
$$;

update public.projects
set policy_inheritance_mode = 'custom'
where coalesce(ai_assurance_enabled, false) = true
   or pg_temp.policy_safe_array_length(policy_config->'custom_rules') > 0
   or pg_temp.policy_safe_array_length(policy_config->'exclude_paths') > 0
   or pg_temp.policy_safe_bool(policy_config->>'complexity_enabled', true) <> true
   or pg_temp.policy_safe_int(policy_config->>'complexity_threshold', 10) <> 10
   or pg_temp.policy_safe_bool(policy_config->>'nesting_enabled', true) <> true
   or pg_temp.policy_safe_int(policy_config->>'nesting_threshold', 4) <> 4
   or pg_temp.policy_safe_bool(policy_config->>'function_length_enabled', true) <> true
   or pg_temp.policy_safe_int(policy_config->>'function_length_threshold', 50) <> 50
   or pg_temp.policy_safe_bool(policy_config->>'arg_count_enabled', true) <> true
   or pg_temp.policy_safe_int(policy_config->>'arg_count_threshold', 5) <> 5
   or pg_temp.policy_safe_bool(policy_config->>'security_enabled', true) <> true
   or pg_temp.policy_safe_bool(policy_config->>'secrets_enabled', true) <> true
   or pg_temp.policy_safe_bool(policy_config->>'quality_enabled', true) <> true
   or pg_temp.policy_safe_bool(policy_config->>'dead_code_enabled', true) <> true
   or pg_temp.policy_safe_bool(policy_config->'gate'->>'enabled', true) <> true
   or coalesce(policy_config->'gate'->>'mode', 'zero-new') <> 'zero-new'
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_category'->>'SECURITY', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_category'->>'SECRET', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_category'->>'QUALITY', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_category'->>'DEAD_CODE', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_category'->>'DEPENDENCY', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_severity'->>'CRITICAL', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_severity'->>'HIGH', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_severity'->>'MEDIUM', 0) <> 0
   or pg_temp.policy_safe_int(policy_config->'gate'->'by_severity'->>'LOW', 0) <> 0;
