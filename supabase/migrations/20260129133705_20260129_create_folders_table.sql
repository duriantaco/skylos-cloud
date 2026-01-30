create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists folders_project_id_idx on public.folders(project_id);
create index if not exists folders_org_id_idx on public.folders(org_id);
create index if not exists folders_created_at_idx on public.folders(created_at desc);
