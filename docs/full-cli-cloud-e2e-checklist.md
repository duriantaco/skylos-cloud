# Skylos Full CLI-Cloud E2E Checklist

Status: current shipped workflow
Last updated: 2026-04-11

This is the full checkbox runbook for testing the live Skylos workflow end to end across both repos:

- dashboard project creation
- CLI login, project linking, whoami, credits, and sync
- policy save and policy pull to the repo
- core scan upload and dashboard verification
- open issues and recurring issue detail
- suppression and revoke
- share, export, and compare
- AI defense upload and project defense page
- provenance local output and cloud provenance APIs
- link GitHub later
- project unlink and relink regression
- CI workflow generation
- billing and credit purchase path

This checklist is for the shipped flow, not the old workaround-heavy flow.

## Rules

- Use a fresh test project name for every run.
- Stop at the first mandatory failure and record it.
- If a phase is marked `Plan-gated`, skip it only when your current plan does not allow it.
- If a phase is marked `Credit-gated`, check balance first and skip it only when you deliberately do not want to spend credits.
- If you use the known fixture repos below, the expected results should match closely.
- If you use a different repo, only the flow expectations apply, not the exact counts.
- Start failing-gate triage from the scan page, not from the issues page.
- Treat `/dashboard/scans/[id]` as the scan occurrence workbench and `/dashboard/issues/[id]` as the recurring issue record across scans.

## Test Data

Fill these in before you start:

- [ ] CLI version recorded: `________________`
- [ ] Browser workspace/org: `________________`
- [ ] Test project name: `workflow-e2e-________________`
- [ ] Core fixture repo path: `/private/tmp/skylos-e2e-fixture`
- [ ] Provenance fixture repo path: `/private/tmp/skylos-provenance-fixture2`
- [ ] Real GitHub repo URL to link later: `https://github.com/________________`
- [ ] Project ID after creation: `________________`

Use these fixture paths unless you deliberately want non-deterministic results:

```bash
cd /private/tmp/skylos-e2e-fixture
```

## Phase 0: Preconditions

- [x] Run:
  ```bash
  skylos --version
  ```
  Expected:
  - command succeeds
  - version is a current released `4.3.x` build

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos project unlink
  ```
  Expected:
  - local repo-to-project link is removed
  - this does not log you out globally
  - `No repo link found.` is also acceptable if this repo was already unlinked

## Phase 1: Dashboard Project Creation

- [x] Open:
  - `https://skylos.dev/dashboard/projects`

- [x] Click `New Project`

- [x] Enter:
  - `Project Name` = your fresh test project name
  - `Repository URL` = leave blank
  Expected:
  - create button is enabled with only the project name
  - there is no error saying repository URL is required
  - copy explains GitHub can be linked later

- [x] Click `Create Project`
  Expected:
  - project is created successfully
  - API key reveal screen appears
  - copy states the key is shown once
  - copy states GitHub can be linked later

- [x] Click the copy button for the API key once
  Expected:
  - copy UI acknowledges the action

- [x] Finish the modal and return to the project list
  Expected:
  - the new project appears in `/dashboard/projects`

- [x] Open the new project page and record the project ID from the URL
  Expected:
  - the page loads
  - it does not show a dead-end `No repo_url`
  - it shows a clear `No GitHub repository linked yet` message
  - it offers a path to settings

## Phase 2: CLI Login, Project Link, And Account Status

- [x] From the fixture repo, run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos login
  ```
  Expected:
  - browser opens
  - there is no `disconnect first` requirement
  - you land on the project chooser flow

- [x] In the browser chooser:
  - select the project created in Phase 1
  Expected:
  - browser shows `Project linked!`

- [x] Back in terminal, run:
  ```bash
  skylos project status
  ```
  Expected:
  - the active project is the one created in Phase 1

- [x] Run:
  ```bash
  skylos project list
  ```
  Expected:
  - the chosen project appears in the locally known project list
  - the active project is clearly identified

- [x] Run:
  ```bash
  skylos whoami
  ```
  Expected:
  - org name is shown
  - project name is shown
  - plan is shown

- [x] Run:
  ```bash
  skylos credits
  ```
  Expected:
  - current balance is shown, or `Unlimited credits` for enterprise
  - recent transactions may be shown if any exist
  - billing URL is shown for non-enterprise plans

## Phase 3: Project Policy Save, Pull, And Verification

- [x] Open:
  - `https://skylos.dev/dashboard/settings`
  - switch to the new project if needed

- [x] Confirm you are editing the correct project
  Expected:
  - the settings header or project selector shows the test project name

- [x] In `Quality Gate`, set:
  - `Enable gate` = on
  - `Gate Mode` = `By severity thresholds`
  - `CRITICAL = 1`
  - `HIGH = 10`
  - `MEDIUM = 10`
  - `LOW = 10`

- [x] Click `Save`
  Expected:
  - settings save succeeds
  - the UI shows `Saved!`
  - typing in threshold fields does not jump/scroll the page unexpectedly

- [ ] Refresh the settings page once
  Expected:
  - the saved values still show:
    - `Enable gate` = on
    - `Gate Mode` = `By severity thresholds`
    - `CRITICAL = 1`
    - `HIGH = 10`
    - `MEDIUM = 10`
    - `LOW = 10`

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos sync pull
  ```
  Expected:
  - `.skylos/config.yaml` is created or updated
  - `.skylos/suppressions.json` is created or updated
  - terminal prints `Sync complete`

- [x] Open `.skylos/config.yaml`
  Expected:
  - the pulled config includes the project name or project ID
  - gate mode is `severity`
  - threshold values match the saved policy

- [ ] Policy enforcement check for later phases
  Expected:
  - Phase 4 should fail the gate because the uploaded fixture exceeds the saved thresholds
  - Phase 8 should pass only after suppression changes the effective unsuppressed findings
  - Phase 9 should fail again after revoke restores the blocking finding

## Phase 4: First Core Scan Upload

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos . --danger --secrets --quality --upload
  ```
  Expected flow:
  - local scan runs
  - upload succeeds
  - a scan URL is printed

  Expected result for the fixture repo:
  - `5 dead-code items`
  - `6 security issues`
  - `2 quality issues`
  - grade `F (22/100)`

- [x] Record the first scan URL: `________________`

- [x] Open the scan URL
  Expected:
  - scan belongs to the new project
  - `Quality Gate: FAIL`
  - `0 suppressed`
  - finding `SKY-D212` is present and blocking
  - finding `SKY-D201` is present

## Phase 5: Cloud Verification After First Upload

- [x] Open:
  - `https://skylos.dev/dashboard/scans`
  Expected:
  - the new scan appears in the scans list
  - it is associated with the correct project

- [x] Open:
  - `https://skylos.dev/dashboard/issues`
  Expected:
  - the page title uses `Open Issues`
  - at least one open issue group exists for the uploaded findings
  - the page is not empty for the fixture upload

- [x] Open the first issue group
  Expected:
  - issue detail page loads
  - the page explains it is the recurring issue record across scans
  - canonical file, severity, and rule/group context are visible
  - it offers a path back to the last seen scan

- [ ] From issue detail, click `Open last seen scan`
  Expected:
  - the relevant scan detail page loads
  - the scan page behaves like the primary blocker-triage surface

- [ ] On the scan detail page, select a finding that belongs to an issue group
  Expected:
  - the detail pane offers `Open recurring issue`
  - following that link returns to the matching recurring issue record

## Phase 6: Share, Export, And Compare

### Share

- [x] Open the first scan detail page

- [x] In the top-right action area, click `Share`
  Expected:
  - sharing succeeds
  - a public share URL is generated

- [x] In the share popover, click the copy button
  Expected:
  - copy UI acknowledges the action

- [x] Paste the copied share URL into another tab and open it
  Expected:
  - the shared scan page loads without requiring dashboard navigation

### Export

- [x] Plan-gated: export requires Pro.

- [x] Open the first scan page

- [x] Find the scan actions menu
  Expected:
  - it is the `Export` button in the top-right scan header area
  - clicking it opens JSON / CSV export options

- [x] Open the actions menu and click `Export JSON`
  Expected:
  - a JSON download starts
  - exported scan metadata includes scan ID, project, and stats

- [x] Open the actions menu again and click `Export CSV`
  Expected:
  - a CSV download starts
  - exported rows include rule, category, severity, file path, and suppression flags

### Compare

- [ ] Plan-gated and credit-gated: compare requires Pro and costs 2 credits.

- [ ] Leave this unchecked until you have at least two uploaded scans for the same project.

- [ ] When you have two scans, open:
  - `https://skylos.dev/dashboard/scans/compare`

- [ ] In `Scan A`, choose the older scan

- [ ] In `Scan B`, choose the newer scan

- [ ] Wait for the compare page to load the diff
  Expected:
  - compare summary is visible
  - `new findings`, `resolved findings`, and `unchanged` counts are shown
  - the page does not error when loading the two selected scans

## Phase 7: Suppress A Blocking Finding

- [x] In the failing scan occurrence view, open `SKY-D212`
  Expected:
  - this is done from `/dashboard/scans/<scan-id>`, not `/dashboard/issues/<issue-group-id>`
  - the page is framed as scan-specific blocker triage

- [x] Click `Suppress`

- [x] In the suppression modal, set:
  - `Reason` = `False Positive`
  - `Expiry` = `Never`

- [x] Submit suppression
  Expected:
  - success toast appears
  - top bar suppressed count increases
  - in `New only` mode the suppressed finding disappears

- [ ] Open the matching recurring issue page for `SKY-D212`
  Expected:
  - the page explains it is a recurring issue record across scans
  - it links back to the relevant scan occurrence
  - it does not present the scan-only `New only` / `All` triage controls or duplicate suppression buttons

- [ ] Switch from `New only` to `All`
  Expected:
  - the suppressed finding becomes visible again
  - it shows as ignored / suppressed rather than blocking

- [ ] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos sync pull
  ```
  Expected:
  - `.skylos/suppressions.json` now contains the active suppression

## Phase 8: Re-Upload After Suppression

- [ ] Run the same scan again:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos . --danger --secrets --quality --upload
  ```
  Expected:
  - upload succeeds
  - a new scan URL is printed

- [ ] Record the post-suppression scan URL: `________________`

- [ ] Open the new scan URL
  Expected:
  - `Quality Gate: PASS`
  - `1 suppressed`
  - the previously suppressed `SKY-D212` no longer blocks the gate

## Phase 9: Revoke Suppression And Confirm Regression

- [ ] Open:
  - `/dashboard/projects/<project-id>/suppressions`

- [ ] Find the active suppression for `SKY-D212`

- [ ] Click `Revoke`
  Expected:
  - a proper confirmation modal opens
  - this is not a browser `alert()` or `confirm()`

- [ ] Confirm the revoke in the modal
  Expected:
  - suppression is removed or marked revoked

- [ ] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos sync pull
  ```
  Expected:
  - `.skylos/suppressions.json` no longer contains the active suppression

- [ ] Run the same scan again:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos . --danger --secrets --quality --upload
  ```

- [ ] Record the post-revoke scan URL: `________________`

- [ ] Open the new scan URL
  Expected:
  - `Quality Gate: FAIL`
  - `0 suppressed`
  - `SKY-D212` is blocking again

- [ ] Credit-gated: compare the Phase 8 PASS scan against this post-revoke FAIL scan
  - open `/dashboard/scans/compare`
  - choose the PASS scan as `Scan A`
  - choose the FAIL scan as `Scan B`
  Expected:
  - compare page loads
  - diff summary is visible
  - the page shows a non-empty delta between the two scans

## Phase 10: AI Defense Upload

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos defend . --upload
  ```
  Expected flow:
  - defense scan runs
  - defense upload succeeds
  - a scan URL is printed

  Expected result for the fixture repo:
  - integrations found: `1`
  - score: `16%`
  - rating: `CRITICAL`

- [x] Record the defense scan URL: `________________`

- [x] Open the defense scan URL
  Expected:
  - scan detail page loads
  - an `AI Defense Score` panel is visible
  - it shows `16%`
  - it shows `CRITICAL`

- [x] Open:
  - `/dashboard/projects/<project-id>/defense`
  Expected:
  - defense data is visible at project level
  - latest score, trend, and findings sections render

## Phase 11: Provenance Local And Cloud

### Local Provenance

- [x] Run:
  ```bash
  cd /private/tmp/skylos-provenance-fixture2
  skylos provenance . --json --diff-base HEAD~1
  ```
  Expected result for the provenance fixture:
  - `summary.agent_count = 1`
  - `agent_files` contains `ai_file.py`
  - `agents_seen` contains `cursor`
  - `confidence = "medium"`
  - `agent_lines` contains `[[1, 2]]`

### Cloud Provenance

- [x] Verify provenance is visible on the uploaded scan if provenance data exists
  Expected:
  - scan detail or related cloud views do not error
  - provenance-backed features can query the scan without 500s

- [x] Plan-gated and credit-gated: risk intersection requires Pro and costs 5 credits.

- [x] If testing risk intersection, open the browser console or use the UI path that triggers provenance risk analysis for the defense/core scan
  Expected:
  - request succeeds for a Pro plan with sufficient credits
  - high-risk or medium-risk file intersections are returned when applicable

- [x] Enterprise-gated: provenance audit export requires Enterprise.

- [x] If testing Enterprise audit export, request:
  - `/api/provenance/audit?project_id=<project-id>&format=json`
  - `/api/provenance/audit?project_id=<project-id>&format=csv`
  Expected:
  - JSON and CSV export both succeed
  - audit rows include file path, agent attribution, commit hash, branch, scan date, and scan ID

## Phase 12: Link GitHub Later

- [x] Open project settings for the same project

- [x] In `Repository URL`, enter a real, unique GitHub repository URL

- [x] Click `Save`
  Expected:
  - save succeeds
  - there is no uniqueness error if the repo is unused

- [x] Return to the project page
  Expected:
  - the repository URL now appears on the project
  - the same project is now GitHub-linked

## Phase 13: Project Link Regression Checks

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos project unlink
  ```
  Expected:
  - only the local repo-to-project link is removed
  - credentials remain intact

- [x] Run:
  ```bash
  skylos login
  ```
  Expected:
  - browser chooser opens again
  - there is still no `disconnect first` block

- [x] Select the same project again
  Expected:
  - project relinks cleanly

- [x] Run:
  ```bash
  skylos project status
  ```
  Expected:
  - the repo is linked back to the same project

## Phase 14: CI Workflow Generation

- [x] Run:
  ```bash
  cd /private/tmp/skylos-e2e-fixture
  skylos . --danger --secrets --quality --json -o /tmp/skylos-results.json
  ```
  Expected:
  - JSON results file is written successfully

- [x] Run:
  ```bash
  skylos cicd gate --input /tmp/skylos-results.json --summary
  ```
  Expected for the fixture repo:
  - gate summary is printed
  - command exits non-zero because the fixture should fail the quality gate before suppression

- [x] Run:
  ```bash
  skylos cicd init --upload --defend -o /tmp/skylos-e2e-workflow.yml
  ```
  Expected:
  - workflow file is generated successfully
  - path is printed

- [x] Open `/tmp/skylos-e2e-workflow.yml`
  Expected:
  - file contains a `Run Skylos Analysis` step using `--upload`
  - file contains `SKYLOS_TOKEN`
  - file contains `AI Defense Check`
  - file contains `skylos defend . --fail-on critical --min-score 70 --json -o defense-results.json --upload`
  - file contains `skylos cicd gate`
  - file contains `skylos cicd annotate`
  - file contains `skylos cicd review`

## Phase 15: Billing And Credits

- [ ] Open:
  - `https://skylos.dev/dashboard/billing`
  Expected:
  - current balance is shown
  - current plan is shown
  - available credit packs are shown

- [ ] Confirm the page explains:
  - one-time purchases
  - credits never expire
  - Pro feature summary

- [ ] Start checkout for any visible pack
  Expected:
  - checkout opens correctly
  - selected pack is passed into the billing flow

Do not complete a real purchase unless you intentionally want a real charge.
