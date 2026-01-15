alter table scans add column if not exists diff_context jsonb;
alter table scans add column if not exists tool text not null default 'skylos';
alter table findings add column if not exists new_reason text;
alter table findings add column if not exists tool_rule_id text;
