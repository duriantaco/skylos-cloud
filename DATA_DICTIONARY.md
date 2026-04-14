# Skylos Cloud — Data Dictionary

> Auto-generated from Supabase migrations. Keep in sync when schema changes.

---

## Enums

| Enum | Values |
|------|--------|
| `assignment_status` | `assigned`, `in_progress`, `resolved`, `unassigned` |
| `activity_type` | `comment`, `assignment`, `resolution`, `suppression`, `false_positive`, `status_change` |

---

## Tables

### profiles

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| email | text | YES | — | |
| full_name | text | YES | — | |
| created_at | timestamptz | YES | `now()` | |

---

### organizations

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| name | text | NOT NULL | — | |
| slug | text | NOT NULL | — | UNIQUE |
| plan | text | YES | `'pro'` | |
| created_at | timestamptz | YES | `now()` | |
| credits | integer | YES | `0` | |
| credits_updated_at | timestamptz | YES | `now()` | |
| pro_expires_at | timestamptz | YES | — | |

---

### organization_members

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| **user_id** | uuid | NOT NULL | — | FK → `profiles(id)` ON DELETE CASCADE |
| email | text | YES | — | |
| role | text | YES | `'member'` | CHECK IN (`owner`, `admin`, `member`, `viewer`) |

**Unique:** `(org_id, user_id)`
**Indexes:** `organization_members_user_id_idx`

> **Note:** The FK column is `org_id`, NOT `organization_id`.

---

### projects

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| name | text | NOT NULL | — | |
| repo_url | text | YES | — | |
| api_key_hash | text | NOT NULL | — | |
| policy_config | jsonb | YES | `'{}'` | |
| created_at | timestamptz | YES | `now()` | |
| strict_mode | boolean | YES | `false` | |
| slack_webhook_url | text | YES | — | |
| slack_notifications_enabled | boolean | YES | `false` | |
| slack_notify_on | text | YES | `'failure'` | |
| discord_webhook_url | text | YES | — | |
| discord_notifications_enabled | boolean | YES | `false` | |
| discord_notify_on | text | YES | `'failure'` | |
| github_token | text | YES | — | |
| github_installation_id | bigint | YES | — | |
| ai_assurance_enabled | boolean | YES | `false` | |

**Indexes:** `idx_projects_api_key_hash`, `projects_org_id_idx`

---

### scans

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| commit_hash | text | YES | — | |
| branch | text | YES | — | |
| actor | text | YES | — | |
| stats | jsonb | YES | — | |
| created_at | timestamptz | YES | `now()` | |
| quality_gate_passed | boolean | YES | `false` | |
| is_overridden | boolean | YES | `false` | |
| override_reason | text | YES | — | |
| overridden_at | timestamptz | YES | — | |
| overridden_by | uuid | YES | — | FK → `auth.users(id)` |
| diff_context | jsonb | YES | — | |
| tool | text | NOT NULL | `'skylos'` | |
| analysis_mode | text | NOT NULL | `'static'` | |
| ai_code_detected | boolean | YES | `false` | |
| ai_code_stats | jsonb | YES | — | |
| share_token | text | YES | — | UNIQUE |
| is_public | boolean | YES | `false` | |
| defense_score | jsonb | YES | — | |
| ops_score | jsonb | YES | — | |
| owasp_coverage | jsonb | YES | — | |

**Indexes:** `idx_scans_project_branch`, `idx_scans_project_gate`, `idx_scans_commit_lookup`, `idx_scans_share_token`

---

### findings

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **scan_id** | uuid | NOT NULL | — | FK → `scans(id)` ON DELETE CASCADE |
| rule_id | text | YES | — | |
| file_path | text | YES | — | |
| line_number | integer | YES | — | |
| message | text | YES | — | |
| severity | text | YES | — | |
| category | text | YES | — | |
| created_at | timestamptz | YES | `now()` | |
| snippet | text | YES | — | |
| is_new | boolean | YES | `true` | |
| is_suppressed | boolean | YES | `false` | |
| new_reason | text | YES | — | |
| tool_rule_id | text | YES | — | |
| finding_id | text | YES | — | |
| verification_verdict | text | YES | — | |
| verification_reason | text | YES | — | |
| verification_evidence | jsonb | YES | — | |
| verified_at | timestamptz | YES | — | |
| taint_flow | jsonb | YES | — | |
| sca_metadata | jsonb | YES | — | |
| analysis_source | text | YES | — | |
| analysis_confidence | text | YES | — | |
| llm_verdict | text | YES | — | |
| llm_rationale | text | YES | — | |
| llm_challenged | boolean | YES | `false` | |
| needs_review | boolean | YES | `false` | |
| source | text | NOT NULL | `'skylos'` | |
| source_metadata | jsonb | YES | — | |
| author_email | text | YES | — | |
| group_id | uuid | YES | — | FK → `issue_groups(id)` |

**Indexes:** `idx_findings_scan_id`, `idx_findings_scan_category`, `idx_findings_scan_new_unsuppressed`, `idx_findings_finding_id`, `idx_findings_analysis_source`, `idx_findings_needs_review`, `idx_findings_dependency`, `idx_findings_has_flow`, `findings_group_id_idx`

---

### finding_suppressions

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| rule_id | text | NOT NULL | — | |
| file_path | text | NOT NULL | — | |
| reason | text | YES | — | |
| created_by | uuid | YES | — | FK → `auth.users(id)` |
| created_at | timestamptz | YES | `now()` | |
| expires_at | timestamptz | YES | — | |
| revoked_at | timestamptz | YES | — | |
| line_number | integer | NOT NULL | `0` | |

**Unique:** `(project_id, rule_id, file_path, line_number)`
**Indexes:** `idx_finding_suppressions_lookup`, `idx_suppressions_lookup`

---

### issue_groups

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| fingerprint | text | NOT NULL | — | |
| rule_id | text | YES | — | |
| category | text | YES | — | |
| severity | text | YES | — | |
| status | text | NOT NULL | `'open'` | |
| verification_status | text | YES | `'UNVERIFIED'` | |
| canonical_file | text | YES | — | |
| canonical_line | integer | YES | — | |
| canonical_snippet | text | YES | — | |
| occurrence_count | integer | NOT NULL | `0` | |
| affected_files | text[] | NOT NULL | `'{}'` | |
| first_seen_at | timestamptz | NOT NULL | `now()` | |
| last_seen_at | timestamptz | NOT NULL | `now()` | |
| first_seen_scan_id | uuid | YES | — | |
| last_seen_scan_id | uuid | YES | — | FK → `scans(id)` ON DELETE SET NULL |
| suggested_fix | jsonb | YES | — | |
| data_flow | jsonb | YES | — | |
| created_at | timestamptz | NOT NULL | `now()` | |
| updated_at | timestamptz | NOT NULL | `now()` | |
| source | text | NOT NULL | `'skylos'` | |
| author_email | text | YES | — | |

**Unique:** `(org_id, project_id, fingerprint)`
**Indexes:** `issue_groups_org_project_idx`, `issue_groups_open_last_seen`, `issue_groups_scan`, `issue_groups_status_severity`, `issue_groups_last_seen_scan_id_idx`

---

### issue_comments

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **issue_group_id** | uuid | NOT NULL | — | FK → `issue_groups(id)` ON DELETE CASCADE |
| **user_id** | uuid | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE |
| comment_text | text | NOT NULL | — | |
| mentioned_user_ids | uuid[] | YES | `ARRAY[]::UUID[]` | |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

**Indexes:** `idx_issue_comments_group`, `idx_issue_comments_user`, `idx_issue_comments_mentions` (GIN)

---

### issue_assignments

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **issue_group_id** | uuid | NOT NULL | — | FK → `issue_groups(id)` ON DELETE CASCADE, UNIQUE |
| assigned_to | uuid | YES | — | FK → `auth.users(id)` ON DELETE SET NULL |
| **assigned_by** | uuid | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE |
| status | assignment_status | YES | `'assigned'` | |
| assigned_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |
| notes | text | YES | — | |

**Indexes:** `idx_issue_assignments_user`, `idx_issue_assignments_status`

---

### team_activity_log

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| **user_id** | uuid | NOT NULL | — | FK → `auth.users(id)` ON DELETE CASCADE |
| activity_type | activity_type | NOT NULL | — | |
| entity_type | text | NOT NULL | — | |
| entity_id | uuid | NOT NULL | — | |
| metadata | jsonb | YES | `'{}'` | |
| created_at | timestamptz | YES | `now()` | |

**Indexes:** `idx_team_activity_org`, `idx_team_activity_user`, `idx_team_activity_entity`

---

### folders

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| name | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | `now()` | |

**Indexes:** `folders_project_id_idx`, `folders_org_id_idx`, `folders_created_at_idx`

---

### staff_users

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **user_id** | uuid | NOT NULL | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| created_at | timestamptz | NOT NULL | `now()` | |

---

### analytics_events

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| event_type | text | NOT NULL | — | |
| org_id | uuid | YES | — | FK → `organizations(id)` |
| metadata | jsonb | YES | `'{}'` | |
| created_at | timestamptz | YES | `now()` | |

**Indexes:** `idx_events_type_date`, `idx_events_org`

---

### custom_rules

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| rule_id | text | NOT NULL | — | |
| name | text | NOT NULL | — | |
| description | text | YES | — | |
| severity | text | NOT NULL | `'MEDIUM'` | |
| category | text | NOT NULL | `'custom'` | |
| rule_type | text | NOT NULL | `'yaml'` | |
| yaml_config | jsonb | YES | — | |
| python_code | text | YES | — | |
| enabled | boolean | YES | `true` | |
| created_by | uuid | YES | — | FK → `auth.users(id)` |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

**Unique:** `(org_id, rule_id)`
**Indexes:** `idx_custom_rules_org_enabled`

---

### compliance_frameworks

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| code | text | NOT NULL | — | UNIQUE |
| name | text | NOT NULL | — | |
| version | text | YES | — | |
| description | text | YES | — | |
| is_active | boolean | YES | `true` | |
| created_at | timestamptz | YES | `now()` | |

---

### org_compliance_settings

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| **framework_id** | uuid | NOT NULL | — | FK → `compliance_frameworks(id)` ON DELETE CASCADE |
| enabled | boolean | YES | `true` | |
| next_audit_date | date | YES | — | |
| created_at | timestamptz | YES | `now()` | |

**Unique:** `(org_id, framework_id)`

---

### credit_transactions

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| amount | integer | NOT NULL | — | |
| balance_after | integer | NOT NULL | — | |
| transaction_type | text | NOT NULL | — | CHECK IN (`purchase`, `deduction`, `refund`, `bonus`) |
| description | text | NOT NULL | — | |
| metadata | jsonb | YES | `'{}'` | |
| created_at | timestamptz | YES | `now()` | |
| created_by | uuid | YES | — | FK → `auth.users(id)` |

**Indexes:** `idx_credit_transactions_org_id`, `idx_credit_transactions_type`

---

### feature_credit_costs

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| feature_key | text | NOT NULL | — | UNIQUE |
| cost_credits | integer | NOT NULL | — | |
| cost_period | text | YES | `'one_time'` | |
| description | text | NOT NULL | — | |
| enabled | boolean | YES | `true` | |
| created_at | timestamptz | YES | `now()` | |
| updated_at | timestamptz | YES | `now()` | |

---

### credit_purchases

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **org_id** | uuid | NOT NULL | — | FK → `organizations(id)` ON DELETE CASCADE |
| credits | integer | NOT NULL | — | |
| amount_cents | integer | NOT NULL | — | |
| currency | text | NOT NULL | `'usd'` | |
| pack_name | text | NOT NULL | — | |
| ls_order_id | text | YES | — | |
| status | text | NOT NULL | `'completed'` | |
| metadata | jsonb | YES | `'{}'` | |
| created_at | timestamptz | NOT NULL | `now()` | |
| created_by | uuid | YES | — | FK → `auth.users(id)` |

**Indexes:** `idx_credit_purchases_org_id`, `idx_credit_purchases_ls_order`

---

### verify_usage_daily

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **owner_id** | uuid | NOT NULL | — | PK (composite) |
| **day** | date | NOT NULL | — | PK (composite) |
| count | integer | NOT NULL | `0` | |
| updated_at | timestamptz | NOT NULL | `now()` | |

---

### defense_scores

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **scan_id** | uuid | NOT NULL | — | FK → `scans(id)` ON DELETE CASCADE, UNIQUE |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| weighted_score | integer | NOT NULL | `0` | |
| weighted_max | integer | NOT NULL | `0` | |
| score_pct | integer | NOT NULL | `100` | |
| risk_rating | text | NOT NULL | `'SECURE'` | |
| passed | integer | NOT NULL | `0` | |
| total | integer | NOT NULL | `0` | |
| ops_passed | integer | NOT NULL | `0` | |
| ops_total | integer | NOT NULL | `0` | |
| ops_score_pct | integer | NOT NULL | `100` | |
| ops_rating | text | NOT NULL | `'EXCELLENT'` | |
| integrations_found | integer | NOT NULL | `0` | |
| files_scanned | integer | NOT NULL | `0` | |
| created_at | timestamptz | NOT NULL | `now()` | |

**Indexes:** `idx_defense_scores_project`, `idx_defense_scores_scan`

---

### defense_integrations

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **scan_id** | uuid | NOT NULL | — | FK → `scans(id)` ON DELETE CASCADE |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| provider | text | NOT NULL | — | |
| integration_type | text | NOT NULL | `'chat'` | |
| location | text | NOT NULL | — | |
| model | text | YES | — | |
| tools_count | integer | NOT NULL | `0` | |
| input_sources | jsonb | YES | `'[]'` | |
| weighted_score | integer | NOT NULL | `0` | |
| weighted_max | integer | NOT NULL | `0` | |
| score_pct | integer | NOT NULL | `100` | |
| risk_rating | text | NOT NULL | `'SECURE'` | |
| created_at | timestamptz | NOT NULL | `now()` | |

**Unique:** `(scan_id, location)`
**Indexes:** `idx_defense_integrations_scan`, `idx_defense_integrations_project`

---

### defense_findings

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| **id** | uuid | NOT NULL | `gen_random_uuid()` | PK |
| **scan_id** | uuid | NOT NULL | — | FK → `scans(id)` ON DELETE CASCADE |
| **project_id** | uuid | NOT NULL | — | FK → `projects(id)` ON DELETE CASCADE |
| integration_id | uuid | YES | — | FK → `defense_integrations(id)` ON DELETE CASCADE |
| plugin_id | text | NOT NULL | — | |
| category | text | NOT NULL | `'defense'` | |
| severity | text | NOT NULL | `'medium'` | |
| weight | integer | NOT NULL | `2` | |
| passed | boolean | NOT NULL | `false` | |
| location | text | YES | — | |
| message | text | YES | — | |
| owasp_llm | text | YES | — | |
| remediation | text | YES | — | |
| created_at | timestamptz | NOT NULL | `now()` | |

**Indexes:** `idx_defense_findings_scan`, `idx_defense_findings_integration`, `idx_defense_findings_project`

---

## FK Quick Reference

A lookup for common join patterns to avoid column name mistakes:

| Join | Correct ON clause |
|------|-------------------|
| `organization_members` → `organizations` | `om.org_id = o.id` |
| `organization_members` → `profiles` | `om.user_id = p.id` |
| `projects` → `organizations` | `p.org_id = o.id` |
| `scans` → `projects` | `s.project_id = p.id` |
| `findings` → `scans` | `f.scan_id = s.id` |
| `findings` → `issue_groups` | `f.group_id = ig.id` |
| `issue_groups` → `projects` | `ig.project_id = p.id` |
| `issue_comments` → `issue_groups` | `ic.issue_group_id = ig.id` |
| `issue_assignments` → `issue_groups` | `ia.issue_group_id = ig.id` |
| `defense_scores` → `scans` | `ds.scan_id = s.id` |
| `defense_scores` → `projects` | `ds.project_id = p.id` |
| `defense_integrations` → `scans` | `di.scan_id = s.id` |
| `defense_findings` → `defense_integrations` | `df.integration_id = di.id` |
| `finding_suppressions` → `projects` | `fs.project_id = p.id` |
| `credit_transactions` → `organizations` | `ct.org_id = o.id` |
| `folders` → `projects` | `f.project_id = p.id` |
| `folders` → `organizations` | `f.org_id = o.id` |
| `custom_rules` → `organizations` | `cr.org_id = o.id` |

---

## Key Security-Definer Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Creates profile on auth signup |
| `init_workspace()` | Creates org + owner role + default project (50 credits, 7-day Workspace trial) |
| `deduct_credits(org uuid, amount int, ...)` | Atomic credit deduction |
| `add_credits(org uuid, amount int, ...)` | Atomic credit addition |
| `bump_verify_usage_daily(owner uuid)` | Rate-limit counter for Verify API |
| `get_user_org_ids()` | Returns user's org IDs (avoids RLS recursion) |
| `is_org_admin(org uuid)` | Checks admin/owner role |
| `log_team_activity(...)` | Logs collaboration events |
