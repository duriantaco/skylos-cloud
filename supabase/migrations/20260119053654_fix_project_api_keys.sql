create extension if not exists pgcrypto;

alter table public.projects
  alter column api_key
  set default ('sk_live_' || encode(extensions.gen_random_bytes(24), 'hex'));

update public.projects
set api_key = 'sk_live_' || encode(extensions.gen_random_bytes(24), 'hex')
where api_key is null;

alter table public.projects
  add constraint projects_api_key_prefix_new
  check (
    api_key is null
    or api_key like 'sk_live_%'
    or api_key ~ '^[0-9a-f]{32,64}$'
  );

create unique index if not exists projects_api_key_unique
  on public.projects (api_key);
