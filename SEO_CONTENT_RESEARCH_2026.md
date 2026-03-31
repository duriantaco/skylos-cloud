# SEO Content Research and Page Plan

Date: March 12, 2026

## Summary

Skylos is already getting indexed and ranked, but the current organic footprint is still mostly branded. That is good for a one-month-old site, but it also means traffic growth will stall unless the site starts winning non-branded searches tied to real Python security and static-analysis problems.

The strongest path is not broad head terms like `python linter` or `SAST`. The strongest path is a focused cluster of:

- competitor comparisons
- Python-specific workflow guides
- GitHub Actions security content
- AI-generated code verification content
- dead-code detection content

## What the Current Data Means

Based on the Search Console data shared in chat:

- homepage: 144 impressions, average position around 3.8
- `python-sast-comparison-2026`: 39 impressions, average position around 5.8
- `/vscode`: 30 impressions, average position around 7.0
- `rules-reference`: 29 impressions, average position around 3.9

The interpretation is straightforward:

- Google trusts the site enough to rank it.
- Most impressions are still branded, which means discovery is still attached to the Skylos name.
- The non-branded article and `/vscode` page are the first real signs of scalable search demand.
- `rules-reference` suggests documentation and reference content can work well if expanded.

## Research Signals

### Google Search guidance

Google says successful SEO is still rooted in people-first content, first-hand expertise, clear site focus, and pages that fully satisfy a user's goal. Google also explicitly warns against creating content mainly to attract search clicks, mass-producing trend-chasing pages, or refreshing dates without substantial changes.

Google also recommends unique, descriptive, concise page titles and says the visible page heading should align with the main title of the page.

Implication for Skylos:

- comparison pages should include real test data and clear product tradeoffs
- use-case pages should solve one specific Python workflow problem end to end
- titles should stay specific and keyword-matched, not marketing-heavy

### VS Code Python linting market

Microsoft's current VS Code Python linting documentation says users should choose a linter extension from the Marketplace, can use multiple linters at the same time, and notes that old `python.linting` settings are deprecated in favor of tool extensions.

Implication for Skylos:

- `/vscode` should target search intent around Python linting, static analysis, and extension migration
- there is a clear content opportunity around `python.linting deprecated`, `VS Code Python linter`, and `Ruff vs other tools in VS Code`

### GitHub Actions security market

GitHub's current secure-use guidance says pinning an action to a full-length commit SHA is the only immutable release option. GitHub also emphasizes the risk of third-party actions because a compromised action can access repository secrets and the `GITHUB_TOKEN`.

The March 14, 2025 `tj-actions/changed-files` incident documented by StepSecurity is concrete evidence that GitHub Actions supply-chain risk is not theoretical.

Implication for Skylos:

- GitHub Actions security is a real, current pain point
- content that combines Python scanning with workflow hardening is highly relevant
- Skylos should publish pages that solve security scanning and workflow safety together, not separately

### AI-generated code market

Sonar's January 8, 2026 survey press release says:

- 72% of developers who tried AI use it every day
- AI accounts for 42% of committed code
- 96% do not fully trust AI-generated code
- only 48% always verify AI-assisted code before committing it

Implication for Skylos:

- AI code verification is now a real workflow category
- this is not just a trend topic; it maps directly to code review, PR checks, and static analysis
- Skylos has a credible angle because it can position itself as a Python verification gate for AI-generated code

### Dead-code tool landscape

Current official tool pages show that:

- Vulture is active and updated, with a March 4, 2026 release on PyPI
- `deadcode` is another live Python tool category and explicitly positions itself alongside Ruff and Flake8 for unused global code detection
- both tools admit limitations tied to Python's dynamic behavior and false positives

Implication for Skylos:

- dead-code detection is not a niche topic; it has multiple active tools and search intent
- there is a strong opportunity for comparison pages beyond only Vulture
- Skylos can differentiate on framework awareness, CI workflow, and security overlap

## Current Content Coverage

The repo already covers these clusters:

- Python SAST comparison
- Semgrep comparison
- AI-generated code security
- dead-code detection
- Python security scanner in GitHub Actions
- VS Code extension landing page
- false positives
- benchmark and case-study content

This is a strong start. The biggest gap is not topic quality. The gap is coverage depth around adjacent comparison terms and workflow-specific search intent.

## Best Next Pages

These are the best next pages to publish, in order.

| Priority | Suggested URL | Working title | Primary keyword cluster | Why this is a strong fit |
| --- | --- | --- | --- | --- |
| 1 | `/compare/deadcode-vs-vulture-vs-skylos` | Deadcode vs Vulture vs Skylos for Python Dead Code Detection | `deadcode vs vulture`, `python dead code detection tools`, `vulture alternative python` | Live tool category, direct buyer intent, clear product overlap, low brand mismatch |
| 2 | `/blog/python-linting-deprecated-vscode` | `python.linting` Is Deprecated in VS Code: What Python Teams Should Use Now | `python.linting deprecated`, `VS Code Python linting`, `VS Code Python linter` | Official Microsoft docs confirm the migration, and your `/vscode` page already has impressions |
| 3 | `/use-cases/secure-github-actions-python` | How to Secure GitHub Actions for Python Repos | `GitHub Actions security Python`, `secure GitHub Actions`, `pin actions SHA`, `Python CI security` | Current, high-trust pain point backed by GitHub guidance and real incidents |
| 4 | `/compare/bandit-vs-codeql-vs-semgrep-python` | Bandit vs CodeQL vs Semgrep for Python Security Scanning | `bandit vs codeql`, `bandit vs semgrep python`, `python codeql alternative` | Strong comparison intent and clear AppSec buyer relevance |
| 5 | `/use-cases/python-secrets-scanner-github-actions` | Python Secrets Scanner for GitHub Actions | `python secrets scanner github actions`, `secret scanning python CI`, `github actions secret scanning python` | Narrower than broad SAST, easier to satisfy intent, directly product-aligned |
| 6 | `/blog/verify-ai-generated-python-code` | How to Verify AI-Generated Python Code Before Merge | `verify AI-generated code`, `AI code review Python`, `AI code verification`, `secure AI coding workflow` | Strong 2026 demand and strong alignment with Skylos positioning |
| 7 | `/compare/ruff-vs-vulture-deadcode-python` | Ruff vs Vulture for Detecting Dead Code in Python | `ruff vs vulture`, `ruff dead code`, `find unused code python` | Good search adjacency, especially for developers already using Ruff |
| 8 | `/blog/github-actions-supply-chain-security-checklist` | GitHub Actions Supply Chain Security Checklist for Python Teams | `GitHub Actions supply chain security`, `GitHub Actions security checklist`, `CI/CD secret leakage` | Directly connected to 2025-2026 incident awareness |

## Pages to Deprioritize

These are not the best early targets for Skylos:

- `python linter`
- `best python linter`
- `SAST`
- `security scanner`
- `code review AI`

Reasons:

- the search intent is too broad
- the SERPs are crowded with incumbents, docs, and generic listicles
- the user intent is often not specifically about Python security or dead-code workflows
- Skylos is more likely to win narrower workflow searches first

## Recommended Content Format by Query Type

Use the right page type for the right query. This matters more than publishing volume.

- comparison queries: use `/compare/...`
- step-by-step workflow queries: use `/use-cases/...`
- trend, explanation, and incident queries: use `/blog/...`
- dense rule or configuration lookups: use docs or reference pages

## Internal Linking Plan

Every new page should get links from at least three existing pages.

Suggested link map:

- homepage resource section
- `/compare`
- `/use-cases`
- the main Python SAST comparison article
- the `/vscode` page for any editor-related page
- docs or rules reference for workflow and rule-specific pages

Anchor text should stay natural but specific:

- `deadcode vs vulture`
- `secure GitHub Actions for Python`
- `verify AI-generated Python code`
- `VS Code Python linting`

## 30-Day Publishing Plan

Week 1:

- publish `deadcode-vs-vulture-vs-skylos`
- update homepage and comparison hub links to feature it

Week 2:

- publish `python-linting-deprecated-vscode`
- add internal links from `/vscode`, homepage, and the Python SAST comparison article

Week 3:

- publish `secure-github-actions-python`
- link it from the existing GitHub Actions scanner use-case page

Week 4:

- publish `bandit-vs-codeql-vs-semgrep-python`
- refresh the main comparison hub with stronger comparison clusters

## Page Briefs

### 1. Deadcode vs Vulture vs Skylos

Must include:

- what each tool is actually for
- CLI examples
- false-positive handling
- framework limitations
- fix or autofix story
- CI usage
- when to use each tool

### 2. `python.linting` Deprecated in VS Code

Must include:

- what changed in VS Code
- what Ruff, Pylint, Mypy, and Skylos each cover
- what a linter does not cover
- how Skylos fits alongside, not instead of, a linter

This page should be honest. If it reads like a bait-and-switch, it will not hold rankings.

### 3. Secure GitHub Actions for Python

Must include:

- pin by SHA
- least privilege for `GITHUB_TOKEN`
- third-party action risk
- secret handling
- pull request scanning
- Python static analysis command examples

### 4. Bandit vs CodeQL vs Semgrep

Must include:

- what each tool actually analyzes
- setup complexity
- language and framework coverage
- rule model
- false-positive tradeoffs
- where Skylos overlaps and where it does not

## What to Measure

Track these instead of just impressions:

- clicks by non-branded query
- CTR for pages ranking between positions 4 and 10
- impressions growth for comparison pages
- impressions growth for use-case pages
- whether pages start ranking for non-branded terms within 3 to 6 weeks

## Sources

- Google Search Central: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central title links: https://developers.google.com/search/docs/appearance/title-link
- VS Code Python linting docs: https://code.visualstudio.com/docs/python/linting
- GitHub secure use reference: https://docs.github.com/en/actions/reference/security/secure-use
- StepSecurity `tj-actions/changed-files` incident: https://www.stepsecurity.io/blog/harden-runner-detection-tj-actions-changed-files-action-is-compromised
- Sonar AI coding survey press release: https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/
- Vulture on PyPI: https://pypi.org/project/vulture/
- deadcode on PyPI: https://pypi.org/project/deadcode/
- Bandit docs: https://bandit.readthedocs.io/en/latest/
- Semgrep Bandit comparison: https://semgrep.dev/blog/2021/python-static-analysis-comparison-bandit-semgrep/
