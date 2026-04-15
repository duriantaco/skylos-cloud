# Parallel-Run Onboarding Playbook

This is the safest adoption motion for Skylos today.

Do not force a buyer to rip out CodeQL, Semgrep, or Snyk on day 1. Run Skylos beside the incumbent tool first.

## Goal

Let a new team prove three things before they switch any gate:

- Skylos finds useful net-new issues
- Skylos is not too noisy
- Skylos fits their developer workflow

## Week 1

### Day 1

Install Skylos and run it locally:

```bash
pip install skylos
skylos . --danger --secrets --quality
```

Success criteria:

- install works
- scan completes
- the team sees at least a few findings worth reviewing

### Day 2

Create a baseline:

```bash
skylos baseline .
```

Success criteria:

- the team understands that legacy debt is parked
- future runs can focus on new issues

### Day 3

Generate a CI workflow:

```bash
skylos cicd init
```

Success criteria:

- Skylos runs in CI
- the incumbent tool still runs
- no existing security gate is removed yet

### Day 4

Review three recent PRs with both tools enabled.

Compare:

- issues both tools found
- issues only Skylos found
- issues only the incumbent found
- false positives
- dead code findings
- AI-specific findings

### Day 5

If the team wants history and suppression workflows, connect to Skylos Cloud:

```bash
skylos login
skylos . --danger --secrets --quality --upload
```

Success criteria:

- scans appear in the dashboard
- the team can navigate scan detail and policy

## Week 2

### Day 6 to Day 8

Use Skylos Cloud for policy and suppression review.

Test:

- policy save in `/dashboard/settings`
- `skylos sync pull`
- suppressing one finding in `/dashboard/scans/<id>`
- rerunning the same scan

Success criteria:

- the team understands the policy loop
- suppressions behave predictably

### Day 9 to Day 10

If the repo has LLM integrations, add AI defense:

```bash
skylos defend .
```

Success criteria:

- the team sees whether AI defense produces useful signal
- they decide whether this is a core part of rollout

### Day 11 to Day 14

Decide the gate posture.

Recommended order:

1. informational only
2. baseline-aware PR visibility
3. blocking on new critical security issues
4. broader blocking only after the team trusts the output

## What To Measure During the Parallel Run

- time to install
- time to first useful finding
- false positive review cost
- dead code usefulness
- PR feedback quality
- whether policy and suppressions are understandable
- whether cloud upload is acceptable for the team

## Switch Criteria

Move from parallel run to primary tool only if all of these are true:

- Skylos consistently finds useful issues
- false positive rate is acceptable
- developers accept the CLI and CI workflow
- policy and suppression behavior are predictable
- no critical buyer requirement depends on a feature Skylos does not yet offer

## Do Not Force The Switch If

- the team relies on a large custom-rule program
- the team relies on enterprise identity features not present here
- the team needs broader platform coverage than Skylos currently provides

## Best Sales Language

Say:

- "Run Skylos next to your current tool for two weeks."
- "Keep your current gate until Skylos proves itself."
- "Use Skylos first where it is clearly stronger."

Do not say:

- "Replace your existing stack immediately."
- "Skylos already covers every enterprise workflow you have today."

## Grounded Against

- `skylos/README.md`
- `skylos/login.py`
- `skylos/sync.py`
- `skylos/api.py`
- `skylos-cloud/src/app/dashboard/scans/page.tsx`
- `skylos-cloud/src/app/dashboard/scans/[id]/page.tsx`
- `skylos-cloud/src/app/dashboard/settings/page.tsx`
