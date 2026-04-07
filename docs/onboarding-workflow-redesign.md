# Skylos Onboarding Workflow Redesign

Status: proposed
Owner: product + CLI + cloud
Last updated: 2026-04-07

## Why This Exists

The current Skylos CLI to cloud workflow mixes three concerns into one step:

1. account authentication
2. project selection/creation
3. repository binding / project token issuance

That coupling creates non-standard behavior:

- `skylos login` refuses to run when any valid token already exists
- selecting an existing project from `/cli/connect` silently rotates the project's only API key
- the CLI connect flow can create a project with no repo URL, but the dashboard "New Project" flow hard-requires one
- repo uniqueness is enforced too early for basic onboarding
- long-lived projects make stateful QA confusing because "new" vs "legacy" findings get mixed into the same user flow

This document defines the target workflow, rollout phases, and QA gates.

## Current-State Audit

### CLI

- `/Users/oha/skylos/skylos/login.py`
  - `run_login()` exits early when `get_token()` returns a valid token.
  - `browser_login()` always sends `repo` and `repo_url` from `git remote origin` into `/cli/connect`.
  - `_save_login_result()` writes both global credentials and repo-local `.skylos/link.json`.
- `/Users/oha/skylos/skylos/sync.py`
  - `get_token()` prefers:
    - `SKYLOS_TOKEN`
    - linked-project token from `~/.skylos/credentials.json`
    - default global token
  - `cmd_disconnect()` only clears global credentials.
- `/Users/oha/skylos/skylos/api.py`
  - uploads resolve project context from `.skylos/link.json` or fallback token state.

### Cloud

- `/Users/oha/skylos-cloud/skylos-cloud/src/app/cli/connect/page.tsx`
  - can create a project with `repo_url: null`
  - can connect to an existing project
- `/Users/oha/skylos-cloud/skylos-cloud/src/app/api/cli/connect/route.ts`
  - generates a new API key and overwrites `projects.api_key_hash`
  - this silently revokes the old key
- `/Users/oha/skylos-cloud/skylos-cloud/src/app/api/projects/route.ts`
  - accepts `repo_url: null`
  - enforces uniqueness only when a repo URL exists
- `/Users/oha/skylos-cloud/skylos-cloud/src/components/CreateProjectButton.tsx`
  - requires a GitHub URL in the dashboard UI
- `/Users/oha/skylos-cloud/skylos-cloud/src/components/settings/RepoUrlEditor.tsx`
  - already treats repo binding as an editable later step
- `/Users/oha/skylos-cloud/skylos-cloud/src/components/settings/ApiKeySection.tsx`
  - explicitly warns that rotating the key revokes the old one

## Problems To Fix

### P0

1. Reconnecting a CLI to an existing project silently revokes the current project key.
2. Users cannot smoothly switch project context without disconnecting first.
3. The website and CLI disagree on whether a repo URL is required to create a project.

### P1

4. `login` and "select active project" are treated as the same operation.
5. Upload destination is not explicit enough when no repo link exists.
6. QA for "new vs legacy" findings is mixed into normal user onboarding.

## Product Rules

These rules are not optional. All implementation phases must preserve them.

1. Authentication and project selection are separate concepts.
2. A user must be able to switch the active project without disconnecting the CLI.
3. Basic cloud uploads must work without a GitHub repo binding.
4. Repo binding is required only for GitHub-linked features:
   - GitHub App install
   - PR blocking / check runs
   - OIDC repo-to-project resolution
   - GitHub deep links that depend on verified repo identity
5. The website and CLI must expose the same project states:
   - unbound project
   - repo-bound project
   - GitHub-integrated project
6. The product must never silently revoke an existing token as part of a normal connect flow.
7. Existing linked repos and existing CI tokens must keep working during migration.

## Target User Workflow

### 1. First-time CLI user

1. User runs `skylos . --upload`.
2. CLI checks for:
   - `SKYLOS_TOKEN`
   - active repo link
   - saved active project context
3. If no project context exists, CLI opens a browser connect flow.
4. Browser flow:
   - authenticates the user
   - lets them choose an existing project or create a new one
   - makes repo URL optional
5. CLI stores the selected project as the active local project.
6. Upload proceeds and prints the exact destination project.

### 2. Existing user switching projects

1. User runs an explicit project command.
2. CLI opens the same chooser or switches locally.
3. No disconnect is required.
4. No existing CI token is revoked.

### 3. User adds GitHub integration later

1. User opens project settings in the website.
2. They add a repo URL if the project is unbound.
3. They install or connect the GitHub App.
4. PR blocking and repo-bound features become available only after that step.

### 4. CI / automation

1. CI uses a project API key or OIDC.
2. OIDC requires a unique repo binding.
3. Manual CLI relinking must not break CI secrets.

## Target UX States In The Website

### Dashboard project creation

The dashboard "New Project" modal must support two creation modes:

- project only
  - required: project name
  - optional: repo URL
- project + GitHub binding
  - required: project name
  - optional-but-recommended: repo URL

Copy must say:

- "Repository URL (optional)"
- "Add this later when you want GitHub integration, PR blocking, or OIDC uploads."

### Project settings

Project settings must clearly show one of three badges:

- `Unbound`
- `Repo Linked`
- `GitHub Connected`

The settings page must expose the next step for each state.

### CLI connect page

`/cli/connect` must keep working, but the UI copy must change:

- it is a project selection flow, not a repo-binding flow
- repo URL is informational if present
- creating a project must not imply that GitHub integration is already enabled

## Architecture Decision

### End-state

The end-state should separate:

- user auth/session
- project selection
- project API keys
- repo binding

### Safe rollout reality

The current system is built around a single `projects.api_key_hash`.
That means a true "auth-only login" is not the safest first change.

If we change `skylos login` first without fixing key issuance, we still keep the hidden problem:
selecting an existing project requires generating a new project key, which revokes the old one.

Therefore the safe rollout order is:

1. stop silent key revocation
2. make project selection explicit and repeatable
3. align website and CLI creation flows
4. only then move toward a cleaner auth-vs-project model

## Rollout Plan

## Phase 1: Stop Silent Key Revocation

Goal: reconnecting a CLI to an existing project must not revoke CI or another user's key.

### Cloud changes

1. Introduce multi-key support for projects.
   - add a dedicated table for project API keys
   - fields should include:
     - `id`
     - `project_id`
     - `key_hash`
     - `label`
     - `created_by`
     - `created_at`
     - `last_used_at`
     - `revoked_at`
     - `source` (`cli`, `dashboard`, `ci`, `migration`)
2. Add a shared resolver helper:
   - `resolveProjectFromToken(token)`
   - use it everywhere instead of direct `.eq("api_key_hash", hashApiKey(token))`
3. Keep `projects.api_key_hash` as a legacy fallback during migration.
4. Change `/api/cli/connect`:
   - create a new CLI-scoped key row
   - do not overwrite the legacy project key
5. Change `/api/projects` creation:
   - seed a default project key row
   - keep returning the plaintext once at creation time
6. Change `/api/projects/[id]/rotate`:
   - explicit rotation remains destructive
   - only rotate the default key when the user asks

### Phase 1 file map

Required new backend pieces:

- new migration in `supabase/migrations/*`
  - create `project_api_keys`
  - backfill one active key row from existing `projects.api_key_hash`
- new helper in `src/lib/*`
  - `resolveProjectFromToken(token)`
  - `issueProjectApiKey(projectId, label, source, createdBy)`
  - `rotateDefaultProjectApiKey(projectId, createdBy)`

Required route updates:

- `src/app/api/report/route.ts`
- `src/app/api/sync/whoami/route.ts`
- `src/app/api/sync/config/route.ts`
- `src/app/api/sync/suppressions/route.ts`
- `src/app/api/sync/rules/route.ts`
- `src/app/api/credits/balance/route.ts`
- `src/app/api/verify/route.ts`
- `src/app/api/agent/validate/route.ts`
- `src/app/api/agent-runs/route.ts`
- `src/app/api/cli/connect/route.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/rotate/route.ts`

### CLI changes

1. No user-visible flow change yet.
2. Existing uploads still work.
3. New CLI connections no longer revoke old keys.

### Phase 1 QA script

1. Create a project and capture the initial key.
2. Use that key in a shell and confirm:
   - `sync whoami` works
   - upload works
3. Reconnect a second CLI instance to the same project through `/cli/connect`.
4. Confirm:
   - the original key still works
   - the new key also works
   - both uploads land in the same project
5. Run explicit key rotation from settings.
6. Confirm:
   - the newly rotated default key works
   - the explicitly revoked key fails
   - unrelated non-rotated keys still behave according to the chosen policy

### QA gate

Pass only if:

1. CI token for project A still works after a developer reconnects to project A.
2. Existing repo link uploads still work without relinking.
3. `whoami`, `sync pull`, `verify`, `credits`, `agent validate`, and `report upload` all resolve tokens through the new helper.

## Phase 2: Make Project Selection Explicit

Goal: project selection is repeatable and does not require disconnecting.

### CLI changes

Preferred new command surface:

- `skylos project status`
- `skylos project list`
- `skylos project use`
- `skylos project create`
- `skylos project unlink`

Compatibility rules:

- keep `skylos login`
- keep `skylos sync connect`
- keep `skylos sync status`
- keep `skylos sync disconnect`

Behavior rules:

1. `skylos login`
   - must no longer exit early just because a token already exists
   - if already authenticated / connected, it may still open project selection
2. `skylos project use`
   - switches the local repo to another project
   - updates `.skylos/link.json`
   - never revokes other keys
3. `skylos project unlink`
   - removes only the local project link
   - does not destroy saved credentials or revoke any project key
4. uploads without an active project
   - prompt to connect or choose a project
   - do not require disconnect first

### Cloud changes

1. `/cli/connect` remains the browser handoff target for now.
2. It should support:
   - choose existing project
   - create new project
   - show repo URL as optional metadata
3. Copy must stop implying that repo binding is mandatory.

### QA gate

Pass only if:

1. A connected user can switch from project A to project B without `sync disconnect`.
2. A repo-local link change does not break CI tokens for either project.
3. Upload clearly prints the selected project every time.

## Phase 3: Align Website Project Creation With CLI

Goal: the website must support the same project lifecycle as the CLI.

### Cloud changes

1. Update `CreateProjectButton`:
   - repo URL optional
   - default state is "project only"
2. Keep uniqueness enforcement only when a repo URL is supplied.
3. Update settings UI:
   - show binding state badge
   - show repo URL as optional
   - show GitHub integration as a later step
4. Update project cards / project list:
   - surface binding state without implying GitHub is mandatory

### QA gate

Pass only if:

1. A user can create a project from the dashboard with no repo URL.
2. That project accepts CLI uploads.
3. The same project can later receive a repo URL in settings.
4. After adding the repo URL, GitHub-linked features become available.

## Phase 4: Clean Auth vs Project Context

Goal: move closer to the ideal industry-standard model.

This phase is optional until Phase 1 through Phase 3 are stable.

### Candidate direction

1. Introduce a true account/session credential for the CLI browser flow.
2. Use that account session to list projects and choose/create a local active project.
3. Keep project API keys for CI and machine-to-project access.
4. Reduce `skylos login` to auth + first-time project selection only.

### Constraint

Do not do this phase until multi-key support is live and stable.

## Backward Compatibility Rules

1. Existing `SKYLOS_TOKEN` env-based uploads must keep working.
2. Existing `.skylos/link.json` files must keep working.
3. Existing legacy `projects.api_key_hash` tokens must keep working until migrated.
4. `skylos sync connect <token>` must remain supported during transition.
5. OIDC repo resolution must still require a unique repo binding.

## QA Strategy

The E2E plan must be split into two separate documents and test tracks.

### A. Real user workflow QA

This tests:

1. local scan
2. first upload
3. project creation
4. policy save
5. suppression
6. rerun
7. dashboard visibility
8. AI defense upload/view

This track should use a normal long-lived project.

### B. Stateful gate semantics QA

This tests:

1. new vs legacy findings
2. suppression revoke
3. first-run fail
4. second-run legacy behavior
5. clean fresh project semantics

This track must always start from a fresh project with no prior history.

Do not mix these tracks again.

## Execution Order

This is the required implementation order.

1. Phase 1 migration and token-resolution helper in `skylos-cloud`
2. Phase 1 CLI compatibility in `skylos`
3. Phase 1 QA
4. Phase 2 CLI project commands
5. Phase 2 `/cli/connect` UX update
6. Phase 2 QA
7. Phase 3 website create/settings alignment
8. Phase 3 QA
9. Only after that: Phase 4 auth cleanup

## Reviewer Checklist

Before starting implementation, confirm all of these are true:

- the redesign does not require disconnecting to change project context
- the redesign does not silently revoke CI tokens
- the website can create an unbound project
- repo binding is still enforced for OIDC and GitHub-linked features
- the plan preserves existing uploads and existing link files
- the QA plan separates user workflow from stateful gate semantics

## Immediate Next Step

Implement Phase 1 only:

1. add non-destructive project API key support in `skylos-cloud`
2. add a shared token-resolution helper
3. migrate API routes off direct `projects.api_key_hash` lookups
4. verify that reconnecting a CLI no longer breaks CI

Do not change the visible website flow until Phase 1 is stable.
