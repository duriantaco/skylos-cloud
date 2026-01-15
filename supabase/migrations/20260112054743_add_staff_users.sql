create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.staff_users enable row level security;

drop policy if exists "staff can read self" on public.staff_users;
create policy "staff can read self"
on public.staff_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "no self enroll" on public.staff_users;
create policy "no self enroll"
on public.staff_users
for insert
to authenticated
with check (false);

drop policy if exists "no self update" on public.staff_users;
create policy "no self update"
on public.staff_users
for update
to authenticated
using (false);

drop policy if exists "no self delete" on public.staff_users;
create policy "no self delete"
on public.staff_users
for delete
to authenticated
using (false);
