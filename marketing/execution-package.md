# Skylos Marketing Execution Package

This folder was assembled from the content already in the repo, not from invented marketing context.

Detailed docs:
- `marketing/launch-execution-plan.md`
- `marketing/psychology-messaging-map.md`
- `marketing/growth-ideas-priority-list.md`

## One-Line Strategy

Launch Skylos around a proof-heavy message:

**Catch what AI writes wrong, and what AI silently removes.**

Use the current content library to push one simple adoption path:
- Primary CTA: `pip install skylos && skylos . -a`
- Secondary CTA: `skylos cicd init`

## What The Repo Already Gives You

Proof assets already on hand:
- benchmark and scan-result posts
- merged PR case studies
- comparison pages with buyer intent
- AI-generated code and GitHub Actions use-case pages
- homepage proof blocks and install CTA

High-signal pages to build around:
- `src/content/blog/we-scanned-9-popular-python-libraries.mdx`
- `src/content/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf.mdx`
- `src/content/blog/vibe-coding.mdx`
- `src/content/blog/surviving-the-ai-pr-tsunami.mdx`
- `src/content/compare/deadcode-vs-vulture-vs-skylos.mdx`
- `src/content/compare/bandit-vs-skylos.mdx`
- `src/content/use-cases/ai-generated-code-security.mdx`
- `src/content/use-cases/secure-github-actions-python.mdx`
- `src/app/page.tsx`

## Immediate Priority

1. Tighten homepage and launch-facing copy around one promise only.
2. Put proof before polish everywhere users make a trust decision.
3. Treat comparison pages and use-case pages as the main acquisition wedge.
4. Repackage existing benchmark and PR-proof content into founder-led distribution.
5. Push cold traffic to local install first, then CI setup second.

## Recommended First 7 Tasks

### 1. Homepage message pass

Goal: make the homepage say the same thing as the rest of the launch package.

Use:
- `marketing/psychology-messaging-map.md`
- `src/app/page.tsx`

Focus:
- one primary promise
- one primary CTA
- one secondary CTA
- stronger proof blocks
- fewer broad category claims

### 2. Comparison hub pass

Goal: turn comparison content into the main search and conversion cluster.

Use:
- `marketing/growth-ideas-priority-list.md`
- `src/content/compare/*.mdx`

Focus:
- consistent proof sections
- stronger cross-links
- clear "when to use Skylos" guidance

### 3. AI code security launch pass

Goal: make the AI-generated-code story the front door for new attention.

Use:
- `marketing/launch-execution-plan.md`
- `src/content/use-cases/ai-generated-code-security.mdx`
- `src/content/blog/vibe-coding.mdx`
- `src/content/blog/surviving-the-ai-pr-tsunami.mdx`

Focus:
- clear problem framing
- vivid examples
- direct install CTA

### 4. Dead-code authority pass

Goal: make dead code a second trusted wedge, not a side story.

Use:
- `src/content/use-cases/detect-dead-code-python.mdx`
- `src/content/compare/deadcode-vs-vulture-vs-skylos.mdx`
- `src/content/blog/flask-dead-code-case-study.mdx`
- `src/content/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf.mdx`

Focus:
- framework awareness
- false-positive story
- merged PR proof

### 5. GitHub Actions cluster pass

Goal: connect CI hardening and Python scanning into one workflow story.

Use:
- `src/content/use-cases/secure-github-actions-python.mdx`
- `src/content/use-cases/python-security-github-actions.mdx`

Focus:
- pin-by-SHA guidance
- least privilege
- PR scanning
- move from guide to install

### 6. Founder distribution pack

Goal: turn existing proof into repeatable social/community distribution.

Use:
- `marketing/launch-execution-plan.md`
- `marketing/psychology-messaging-map.md`
- proof-heavy blog posts

Focus:
- one proof point per post
- one direct link back to source article
- no generic brand language

### 7. Internal linking sweep

Goal: make current content compound instead of sitting as isolated pages.

Use:
- `skylos-cloud/SEO_CONTENT_RESEARCH_2026.md`
- all `src/content/blog`, `src/content/compare`, and `src/content/use-cases` pages

Focus:
- comparison-to-comparison links
- blog-to-use-case links
- use-case-to-install links

## Agent Queue

If you want to keep using agents, this is the clean next sequence:

1. Homepage copy worker
   Scope: `src/app/page.tsx`
   Task: align hero, proof blocks, and CTA hierarchy with the messaging map.

2. Comparison cluster worker
   Scope: `src/content/compare/*.mdx`
   Task: add proof blocks, cross-links, and consistent CTA handling.

3. AI-code launch worker
   Scope: selected AI-code blog and use-case pages
   Task: tighten hooks and distribution surfaces around the launch theme.

4. Distribution asset worker
   Scope: new markdown doc under `marketing/`
   Task: draft founder posts, threads, and community post variants from existing content.

## Guardrails

- Do not overclaim beyond visible proof.
- Do not lead with enterprise language.
- Do not ask cold traffic for GitHub connection first.
- Do not broaden into generic `python linter` or `SAST` positioning yet.
- Do not create new campaigns before current proof assets are linked and reused properly.

## Success Signals

- more clicks on local install CTA
- more movement from local install to `skylos cicd init`
- deeper session paths across compare/use-case pages
- more social and community traffic to proof-heavy articles
- more trust signals anchored in evidence, not polish
