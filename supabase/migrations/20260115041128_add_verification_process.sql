alter table findings
add column if not exists finding_id text,
add column if not exists verification_verdict text,
add column if not exists verification_reason text,
add column if not exists verification_evidence jsonb,
add column if not exists verified_at timestamptz;

create index if not exists idx_findings_scan_id on findings(scan_id);
create index if not exists idx_findings_finding_id on findings(finding_id);
