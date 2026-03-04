# Skylos Cloud — Revenue & Gating Audit Benchmark

Use this checklist to verify all monetization gates are correctly enforced.
Run through every check after any feature change or release.

---

## 1. Core Principles

- [ ] Only 3 plan types exist: `free | pro | enterprise`. No references to `team` plan anywhere.
- [ ] `getEffectivePlan()` is used everywhere — never raw `org.plan`.
- [ ] `entitlements.ts` is the SINGLE SOURCE OF TRUTH for plan capabilities.
- [ ] Every 402 response includes `buy_url: "/dashboard/billing"`.
- [ ] Every 403 (PLAN_REQUIRED) response includes `buy_url: "/dashboard/billing"`.
- [ ] Pro is TIME-BOUND via `pro_expires_at`. Expired Pro = free.
- [ ] Credits persist forever. Pro access expires. These are SEPARATE systems.
- [ ] Enterprise = unlimited everything (skip all credit deductions).
- [ ] Server-side gating is MANDATORY. Frontend gating is UX only.
- [ ] No double-charging (if server deducts, client must NOT also deduct).

---

## 2. API Route Gates

### 2.1 Scan Upload — `/api/report` (POST)

- [ ] Uses `getEffectivePlan()` (not raw `org.plan`)
- [ ] Selects `organizations(plan, pro_expires_at)` in query
- [ ] Uses `getReportCaps()` wrapper from entitlements.ts (no stale local PLAN_CAPABILITIES)
- [ ] Credit deduction: 1 credit per scan upload (except enterprise)
- [ ] 402 on insufficient credits with `buy_url`
- [ ] Capabilities (SARIF, overrides, suppressions, check runs, Slack, Discord) match entitlements.ts

### 2.2 Gate Policy — `/api/policy` (PATCH)

- [ ] Free users forced to `zero-new` gate mode (silent downgrade, not error)
- [ ] Pro/Enterprise can use `category`, `severity`, `both` modes
- [ ] Uses `canUseAdvancedGates()` from entitlements

### 2.3 Quality Gate Override — `/api/scans/[id]/override` (POST)

- [ ] Requires Pro plan (`requirePlan(plan, "pro", "Gate Override")`)
- [ ] 403 with `buy_url` for free users

### 2.4 Team Invite — `/api/team/invite` (POST)

- [ ] Requires Pro plan
- [ ] 403 with `buy_url` for free users

### 2.5 Team Activity — `/api/team/activity` (GET)

- [ ] Requires Pro plan
- [ ] 403 with `buy_url` for free users

### 2.6 Issue Comments — `/api/issue-groups/[id]/comments` (POST)

- [ ] Requires Pro plan (plan gate only, NO credit cost)
- [ ] 403 for free users, 200 for Pro (no credits deducted)
- [ ] 403 for EXPIRED Pro (effective plan = free)

### 2.7 Issue Assignment — `/api/issue-groups/[id]/assign` (POST)

- [ ] Requires Pro plan (plan gate only, NO credit cost)

### 2.8 Finding Suppress — `/api/findings/[id]/suppress` (POST)

- [ ] Free users MUST provide `expires_at` (no permanent suppressions)
- [ ] Free users limited to 25 active suppressions per project
- [ ] Pro/Enterprise: unlimited, permanent OK
- [ ] Count query filters by `is("revoked_at", null)`

### 2.9 Issue Group Suppress — `/api/issue-groups/[id]/suppress` (POST)

- [ ] Same rules as finding suppress (expiry required for free, limit enforced)
- [ ] Count query should filter by `is("revoked_at", null)` for accuracy

### 2.10 PR Auto-Fix — `/api/findings/[id]/fix` (POST)

- [ ] Requires Pro plan AND 3 credits (LLM compute)
- [ ] Plan gate checked FIRST, then credit gate
- [ ] 403 for free (plan), 402 for Pro with insufficient credits

### 2.11 Compliance Report — `/api/compliance/report` (POST)

- [ ] Requires Pro plan (not "team") AND 500 credits
- [ ] Server-side credit deduction (not client-side)
- [ ] Plan check uses `["pro", "enterprise"]`, not `["team", "enterprise"]`

### 2.12 Scan Export — `/api/scans/[id]/export` (GET)

- [ ] Requires Pro plan (plan gate only, NO credit cost)
- [ ] 403 with `buy_url` for free users

### 2.13 Slack Integration — `/api/projects/[id]/slack` (POST)

- [ ] Requires Pro plan

### 2.14 Discord Integration — `/api/projects/[id]/discord` (POST)

- [ ] Requires Pro plan

### 2.15 Credit Deduction — `/api/credits/deduct` (POST)

- [ ] Enterprise bypassed (unlimited)
- [ ] 402 on insufficient credits includes `buy_url`

### 2.16 Project Creation — `/api/projects` (POST)

- [ ] Enforces `maxProjectsAllowed` from entitlements (free=1, pro=10, enterprise=unlimited)
- [ ] 403 on limit reached includes `buy_url`

### 2.17 Custom Rules — `/api/custom-rules` (POST)

- [ ] Plan check uses `["pro", "enterprise"]`, NOT `["pro", "team", "enterprise"]`

### 2.18 Verify — `/api/verify` (POST)

- [ ] Uses `getEffectivePlan()` with `pro_expires_at`
- [ ] Free: 20/day rate limit via `bump_verify_usage_daily` RPC
- [ ] 429 on limit includes `buy_url` (not `upgrade_url`)

### 2.19 Trends — `/api/trends` (GET)

- [ ] NEVER returns 403 — viewing is always allowed
- [ ] Free users: data limited to 7 days, 1 project
- [ ] Pro users: full history, all projects, branch filters

### 2.20 Whoami — `/api/whoami` (GET)

- [ ] Uses `getEffectivePlan()`
- [ ] SARIF capability matches entitlements.ts (Pro, not enterprise-only)

### 2.21 CLI Connect — `/api/cli/connect` (POST)

- [ ] Uses `getEffectivePlan()` with `pro_expires_at`

---

## 3. Frontend Gates

### 3.1 Dashboard Home — `/dashboard`

- [ ] Stale data nudge when last scan > 7 days + 0 credits
- [ ] Pro expiry banner when expiring in < 7 days
- [ ] Pro expired banner with reactivation CTA

### 3.2 Trends Page — `/dashboard/trends`

- [ ] Free: default range = 7 days
- [ ] Free: 30d/90d buttons locked with Lock icon
- [ ] Free: branch picker hidden
- [ ] Free: upsell banner "Viewing last 7 days. Upgrade to Pro..."
- [ ] Pro/Enterprise: all filters available

### 3.3 Scan Detail — `/dashboard/scans/[id]`

- [ ] Override button hidden for free users
- [ ] ScanActions passes correct `plan` prop
- [ ] Export locked for free (Lock icon + alert)

### 3.4 Project Detail — `/dashboard/projects/[id]`

- [ ] Resolves effective plan and passes to ScanActions
- [ ] ScanActions export locked for free

### 3.5 Issue Detail — `/dashboard/issues/[id]`

- [ ] Comments section: ProFeatureLock for free, functional for Pro
- [ ] Assignment: ProFeatureLock for free, functional for Pro
- [ ] Viewing issue data is ALWAYS free (never block viewing)

### 3.6 Activity Page — `/dashboard/activity`

- [ ] Full Pro lock screen for free (Lock icon + CTA)
- [ ] Uses `getEffectivePlan()` for plan resolution

### 3.7 Settings Page — `/dashboard/settings`

- [ ] PolicyEditor: advanced gate modes locked for free with Lock + upgrade link
- [ ] TeamMembers: invite form replaced with Pro lock card for free
- [ ] Slack/Discord: overlay with "Buy any credit pack to unlock" CTA
- [ ] Both PolicyEditor and TeamMembers receive `plan` prop

### 3.8 Compliance Page — `/dashboard/compliance`

- [ ] Plan check uses `["pro", "enterprise"]`, NOT `["team", "enterprise"]`
- [ ] CTA text: "Buy Credits to Unlock Pro" (not "Upgrade to Team — $199/mo")

### 3.9 Billing Page — `/dashboard/billing`

- [ ] Shows Pro status (active/expiring/expired)
- [ ] "What Pro Unlocks" section for free users
- [ ] Credit cost reference table (only compute-heavy actions)
- [ ] Pro unlock durations per pack: Starter=30d, Builder=90d, Team=180d, Scale=365d

---

## 4. CLI Gates

### 4.1 Upload (`--upload`)

- [ ] Checks credit balance BEFORE uploading
- [ ] 0 credits → hard `return` (abort upload, not just warning)
- [ ] Enterprise: unlimited (skip check)

### 4.2 Credits Command (`skylos credits`)

- [ ] Shows current balance
- [ ] Shows buy link

### 4.3 Verify (`skylos cicd verify`)

- [ ] Server enforces 20/day free limit
- [ ] Client handles 429 gracefully

---

## 5. MCP Gates

### 5.1 Credit Deduction (`skylos_mcp/auth.py`)

- [ ] FAIL-CLOSED on non-200 status (returns `(False, error)`, NOT `(True, "")`)
- [ ] FAIL-CLOSED on exception (returns `(False, error)`, NOT `(True, "")`)
- [ ] Error messages include billing URL

---

## 6. Payment System

### 6.1 Credit Purchase (`fulfillCreditPurchase`)

- [ ] Sets `pro_expires_at` (not just `plan: 'pro'`)
- [ ] Pro duration: Starter=30d, Builder=90d, Team=180d, Scale=365d
- [ ] STACKS on repeat purchase (extends existing expiry, doesn't reset)
- [ ] Credits added to balance (persist forever)

### 6.2 Starter Credits

- [ ] New org gets 50 free credits on creation
- [ ] New org gets 7-day Pro trial (`pro_expires_at = now + 7 days`)

---

## 7. Database

### 7.1 Organizations Table

- [ ] Has `pro_expires_at` column (timestamptz)
- [ ] Existing Pro users grandfathered with 90-day expiry
- [ ] Enterprise users have far-future expiry (2099)

### 7.2 Feature Credit Costs Table

- [ ] Only compute-heavy per-use features (scan_upload, pr_review, ai_triage, scan_diff, compliance_report, mcp_*)
- [ ] NO monthly features (dashboard_access, team_collaboration, etc. removed)

---

## 8. Credit Costs Reference

| Action | Credits | Gate Type |
|--------|---------|-----------|
| Scan upload | 1 | Credit |
| Scan comparison | 2 | Credit |
| PR auto-fix | 3 | Credit + Pro |
| AI issue triage | 5 | Credit + Pro |
| MCP AI remediation | 10 | Credit + Pro |
| Compliance report | 500 | Credit + Pro |
| Team comments | 0 | Pro only |
| Team assignments | 0 | Pro only |
| Findings export | 0 | Pro only |
| Slack/Discord setup | 0 | Pro only |
| Override quality gate | 0 | Pro only |
| Advanced gate modes | 0 | Pro only |

---

## 9. Plan Capabilities Quick Reference

| Capability | Free | Pro | Enterprise |
|-----------|------|-----|------------|
| Projects | 1 | 10 | Unlimited |
| Scans stored | 10 | 500 | 10,000 |
| History retention | 7 days | 90 days | 365 days |
| Gate modes | zero-new only | All | All |
| Overrides | No | Yes | Yes |
| PR inline comments | No | Yes | Yes |
| Team collab | No | Yes | Yes |
| Integrations | No | Yes | Yes |
| Full trends | No | Yes | Yes |
| Exports | No | Yes | Yes |
| Custom rules | 3 | 50 | Unlimited |
| Suppressions/project | 25 (expiry req) | Unlimited | Unlimited |

---

*Last updated: 2026-03-04*
*Run this checklist after every feature change or release.*
