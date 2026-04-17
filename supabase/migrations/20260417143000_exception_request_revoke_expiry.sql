alter table public.policy_exception_requests
  add column if not exists expires_at timestamptz;

alter table public.finding_suppressions
  add column if not exists exception_request_id uuid references public.policy_exception_requests(id) on delete set null;

create index if not exists idx_exception_requests_status_expiry
  on public.policy_exception_requests (org_id, status, expires_at);

create index if not exists idx_finding_suppressions_exception_request
  on public.finding_suppressions (exception_request_id)
  where exception_request_id is not null;
