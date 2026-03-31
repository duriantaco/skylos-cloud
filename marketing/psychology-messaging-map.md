# Skylos Psychology + Messaging Map

## Purpose

This map turns the current Skylos proof into messaging that developers will actually trust. It is grounded in the product context, homepage copy, benchmark posts, comparison pages, and the repo's own marketing review notes.

## Core Audience

- Startups using AI coding assistants in production.
- Individual developers, tech leads, and DevSecOps engineers.
- Buyers who care about shipping speed, but will not trade away security or code clarity.

## The 8 Most Relevant Psychology Models

### 1. Jobs To Be Done

**Why it matters**

People are not buying "static analysis." They are hiring Skylos to catch the things AI-generated code misses before they land in main.

**Where it appears or should appear**

- Current context: `skylos-cloud/FOUNDER_MARKETING_REVIEW_2026.md`
- Homepage hero in `skylos-cloud/src/app/page.tsx`
- Use cases like `skylos-cloud/src/content/use-cases/ai-generated-code-security.mdx`
- `skylos-cloud/src/content/use-cases/detect-dead-code-python.mdx`

**Ethical application**

- Lead with the job: protect shipping velocity without letting AI create hidden risk.
- Avoid feature-first wording unless the feature directly supports that job.
- Keep the promise specific: dead code, removed controls, and AI-introduced regressions.

### 2. Loss Aversion

**Why it matters**

The strongest motivation here is not gain. It is avoiding the downside of shipping unsafe code, hidden dead code, or silently removed auth and rate limits.

**Where it appears or should appear**

- Homepage FAQ and hero in `skylos-cloud/src/app/page.tsx`
- `skylos-cloud/src/content/blog/vibe-coding.mdx`
- `skylos-cloud/src/content/use-cases/secure-github-actions-python.mdx`

**Ethical application**

- Frame the cost of not scanning as wasted review time, security debt, and production exposure.
- Do not fake urgency or invent breach scenarios.
- Use real examples already in the repo, like the benchmarked AI-code failure modes and GitHub Actions hardening guidance.

### 3. Social Proof / Bandwagon Effect

**Why it matters**

Developers trust tools that look adopted by other serious developers. Social proof lowers the perceived risk of trying a new security tool.

**Where it appears or should appear**

- Benchmark sections in `skylos-cloud/src/app/page.tsx`
- `skylos-cloud/src/content/blog/we-scanned-9-popular-python-libraries.mdx`
- `skylos-cloud/src/content/blog/flask-dead-code-case-study.mdx`
- Comparison pages such as `skylos-cloud/src/content/compare/bandit-vs-skylos.mdx`

**Ethical application**

- Show concrete proof: merged PRs into well-known repos, external repos using Skylos, benchmark results, and published scans.
- Do not inflate stars, installs, or user counts beyond what is current and visible.
- Prefer named evidence over generic claims like "trusted by teams."

### 4. Authority Bias

**Why it matters**

Security tools win when they sound like they were built by people who understand the problem deeply, not by marketers who found a keyword cluster.

**Where it appears or should appear**

- Author and methodology blocks in MDX content
- `skylos-cloud/src/content/blog/we-scanned-9-popular-python-libraries.mdx`
- `skylos-cloud/src/content/blog/sast-false-positives-what-works.mdx`
- Homepage benchmark section in `skylos-cloud/src/app/page.tsx`

**Ethical application**

- Surface methodology, test scope, and known limitations.
- Use exact metrics from the repo, not generalized security claims.
- Make the content feel like a technical artifact first, marketing second.

### 5. Availability Heuristic

**Why it matters**

If developers can easily picture the failure mode, they are more likely to believe it is real. The repo already has vivid examples: hallucinated imports, phantom calls, removed auth decorators, and insecure defaults.

**Where it appears or should appear**

- `skylos-cloud/src/content/use-cases/ai-generated-code-security.mdx`
- `skylos-cloud/src/content/blog/vibe-coding.mdx`
- `skylos-cloud/src/content/use-cases/secure-github-actions-python.mdx`

**Ethical application**

- Use concrete code examples and short before/after snippets.
- Keep examples close to real workflows, not contrived fear pieces.
- Make the failure modes easy to remember: "what AI writes wrong" and "what AI silently removes."

### 6. Status Quo Bias / Default Effect

**Why it matters**

Developers prefer not to add another tool unless the default path is simple and safe. The easier the first run, the more likely they are to try Skylos.

**Where it appears or should appear**

- Conversion flow in `skylos-cloud/src/app/page.tsx`
- `skylos-cloud/src/content/use-cases/secure-github-actions-python.mdx`
- `skylos-cloud/src/content/compare/semgrep-vs-skylos.mdx`

**Ethical application**

- Make `pip install skylos && skylos . -a` the obvious first step.
- Keep `skylos cicd init` as the next step, not the first ask.
- Reduce friction with copy that says "try locally first" before "wire it into CI."

### 7. Paradox Of Choice / Hick's Law

**Why it matters**

The homepage currently risks splitting attention across too many angles. Developers are more likely to convert when the decision tree is narrow.

**Where it appears or should appear**

- Homepage messaging in `skylos-cloud/src/app/page.tsx`
- Founder review in `skylos-cloud/FOUNDER_MARKETING_REVIEW_2026.md`
- Primary nav and CTA hierarchy

**Ethical application**

- Keep one primary promise: Skylos catches what AI writes wrong and what AI silently removes.
- Make dead code, security scanning, and AI regression detection support that promise instead of competing with it.
- Use one primary CTA and one secondary CTA only.

### 8. Zeigarnik Effect / Goal Gradient

**Why it matters**

People are more likely to finish what they started. Once a developer sees partial value, they are more likely to take the next step if the path is obvious.

**Where it appears or should appear**

- Onboarding and conversion messaging in `skylos-cloud/src/app/page.tsx`
- `skylos-cloud/src/content/use-cases/detect-dead-code-python.mdx`
- `skylos-cloud/src/content/use-cases/python-security-github-actions.mdx`

**Ethical application**

- Show progress from local scan to CI gate.
- Use copy like "start with one repo" or "scan before merge" to make the next step feel small.
- Do not use fake scarcity or manufactured "almost done" tricks.

## Message Architecture

### Problem

AI coding tools write code quickly, but they also generate dead code, hallucinated references, security flaws, and missing controls. The worst failures are the ones that look plausible in review and only show up later.

### Stakes

- Security regressions ship because reviewers miss what AI removed.
- Dead code accumulates and expands review noise.
- False positives destroy trust in the scanner if the tool is too noisy.
- Teams end up shipping faster while understanding less.

### Proof

- 98.1% recall vs Vulture's 84.6% on 9 popular Python repos.
- 220 false positives vs Vulture's 644.
- 35/35 LLM verification accuracy on pip-tools, tox, and mesa.
- ~25 external repos using Skylos in production.
- Merged cleanup PRs into `psf/black`, `networkx`, `mitmproxy`, `pypdf`, and `Flagsmith`.

### Differentiation

- Diff-aware detection catches removed auth, CSRF, and rate limit controls.
- Framework-aware analysis reduces noise in Django, Flask, FastAPI, Pydantic, pytest, Celery, and Click.
- One tool handles dead code, security, and AI defense.
- Local-first workflow, with CI gating when the team is ready.

### CTA

- Primary: `pip install skylos && skylos . -a`
- Secondary: `skylos cicd init`

## Copy Angles, Headlines, And Hooks

### Angle 1: AI writes wrong code

- Headline: `Catch what AI writes wrong before it lands in main`
- Hook: AI code can look correct and still hide hallucinated imports, phantom calls, and unsafe defaults.

### Angle 2: AI silently removes controls

- Headline: `Catch what AI silently removes`
- Hook: Skylos detects when refactors delete auth decorators, CSRF protection, rate limits, or other security controls.

### Angle 3: Dead code is security debt

- Headline: `Dead code is not just cleanup. It is attack surface.`
- Hook: Skylos finds dead code and the transitive dead paths that Vulture often misses in framework-heavy code.

### Angle 4: Faster review, less triage

- Headline: `High-signal static analysis for teams that are tired of false positives`
- Hook: Skylos is built to be trusted by developers, not ignored by them.

### Angle 5: Local first, CI second

- Headline: `Scan locally in 30 seconds, then gate PRs in CI`
- Hook: Start with a local scan, then move to `skylos cicd init` when the workflow is proven.

### Angle 6: Framework-aware Python security

- Headline: `Framework-aware Python security scanning for Django, Flask, FastAPI, and Pydantic`
- Hook: Generic scanners do not understand framework-registered routes and fixtures. Skylos does.

### Angle 7: Benchmark-led credibility

- Headline: `Benchmarked on real repositories, not toy examples`
- Hook: The product story should point to the published scans and repo benchmarks, not generic claims.

### Angle 8: One tool, multiple outcomes

- Headline: `Dead code, security, and AI defense in one scan`
- Hook: Teams do not need separate tools for cleanup, security, and AI regression detection.

## Trust Risks To Watch

- The homepage is currently ahead of the proof in a few places.
- The docs experience is a visible trust leak if it remains thin or placeholder-driven.
- Enterprise-style claims need evidence or they will feel inflated to developers.
- The product story should not drift into too many categories at once.
- Avoid any stat that is not already visible, benchmarked, or easy to verify.

## What To Prioritize In Copy

1. Specificity over breadth.
2. Proof over polish.
3. Local workflow first, CI workflow second.
4. Honest limitations alongside strengths.
5. Real examples over abstract claims.

## What Not To Say Yet

- Do not call Skylos a full enterprise platform.
- Do not imply universal coverage across all languages and frameworks.
- Do not claim "best" without showing the benchmark basis.
- Do not use urgency or scarcity unless it is real.
- Do not ask for a GitHub connection before the visitor has seen enough proof.
