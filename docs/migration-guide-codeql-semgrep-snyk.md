# Migration Guide Draft: CodeQL, Semgrep, or Snyk -> Skylos

This is the customer-facing migration draft that stays inside current product reality.

The right positioning is not "rip everything out on day 1." The right positioning is "run Skylos in parallel, compare the output, and switch only where Skylos is clearly stronger."

## What Skylos Replaces Well Today

Skylos is strongest when the team wants:

- a local-first CLI
- one workflow for dead code, security, secrets, and quality
- diff-aware PR gating
- AI-focused scanning such as AI provenance and AI defense checks
- optional cloud upload instead of mandatory SaaS

## What Skylos Does Not Replace Cleanly Yet

Do not position Skylos as a full substitute for features that are not clearly present in these repos.

That includes:

- enterprise SSO and identity plumbing
- broad SaaS governance workflows
- deep container, IaC, and license governance programs
- custom rule ecosystems on the scale of Semgrep's community registry
- CodeQL query-pack workflows

## Best Migration Story By Incumbent

### CodeQL -> Skylos

Lead with Skylos if the buyer wants:

- local-first scanning
- dead code detection
- AI regression detection
- AI defense checks
- optional cloud dashboard instead of mandatory platform workflow

Do not claim Skylos replaces:

- CodeQL query packs
- GitHub-native CodeQL authoring workflows

Suggested positioning:

"Keep CodeQL if you rely on query-pack depth. Add Skylos where CodeQL is weak: dead code, AI-specific risk, and low-friction local runs."

### Semgrep -> Skylos

Lead with Skylos if the buyer wants:

- lower-friction local adoption
- dead code detection in the same workflow
- optional cloud upload
- AI-specific scanning beyond generic pattern rules

Do not claim Skylos replaces:

- large custom rule programs
- multi-language custom policy authoring at Semgrep scale

Suggested positioning:

"Use Skylos where you want dead code, quality, AI regression checks, and a tighter local developer workflow. Keep Semgrep if custom rules are the center of your program."

### Snyk -> Skylos

Lead with Skylos if the buyer wants:

- local-first code scanning
- optional cloud upload
- AI provenance
- AI defense checks
- dead code and code quality in the same developer flow

Do not claim Skylos replaces:

- the full breadth of Snyk's platform
- Snyk's broader enterprise portfolio without qualification

Suggested positioning:

"Use Skylos for code scanning, dead code, AI provenance, and AI defense. Keep Snyk for the broader platform areas Skylos is not trying to be yet."

## The Recommended Migration Motion

### Phase 1: Run Skylos Locally

```bash
skylos . --danger --secrets --quality
```

Goal:

- confirm installation is easy
- compare findings on a real repo
- show value without procurement work

### Phase 2: Create a Baseline

```bash
skylos baseline .
```

Goal:

- avoid blocking on legacy debt
- focus on net-new issues

### Phase 3: Add Skylos to CI

```bash
skylos cicd init
```

Goal:

- get PR-native feedback
- keep existing tooling in place

### Phase 4: Add Optional Cloud Upload

```bash
skylos . --danger --secrets --quality --upload
```

Goal:

- get scan history
- configure policy in the dashboard
- manage suppressions
- add team workflows

### Phase 5: Add AI Defense Where It Matters

```bash
skylos defend .
```

Goal:

- audit LLM-integrated code
- add a second workflow the incumbent tool usually does not cover well

## Migration Promise We Can Make Today

We can honestly promise:

- local trial first
- optional cloud second
- GitHub Actions workflow generation
- SARIF output
- project policy in the dashboard
- suppression workflow in the dashboard
- baseline workflow in the CLI

We should not promise:

- automatic suppression import from CodeQL, Semgrep, or Snyk
- one-click migration from another platform
- a like-for-like replacement for an enterprise AppSec platform

## The Best First CTA

The best adoption CTA is still:

```bash
pip install skylos
skylos . --danger --secrets --quality
```

The second CTA is:

```bash
skylos cicd init
```

The third CTA is:

```bash
skylos login
skylos . --danger --secrets --quality --upload
```

## Grounded Against

- `skylos/README.md`
- `skylos/api.py`
- `skylos/sync.py`
- `skylos-cloud/src/app/dashboard/settings/page.tsx`
- `skylos-cloud/src/app/dashboard/billing/page.tsx`
- `skylos-cloud/src/app/api/policy/route.ts`
- `skylos-cloud/src/content/compare/semgrep-vs-skylos.mdx`
- `skylos-cloud/src/content/compare/snyk-vs-skylos.mdx`
- `skylos-cloud/src/content/compare/sonarqube-vs-skylos.mdx`
