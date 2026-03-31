# Skylos Launch Execution Plan

Launch theme: **Catch what AI writes wrong, and what AI silently removes.**

Primary CTA: `pip install skylos && skylos . -a`

Secondary CTA: `skylos cicd init`

Audience segments:
- Python teams shipping with Cursor, Copilot, or Claude Code
- Dev leads and staff engineers responsible for PR quality gates
- AppSec and DevSecOps teams that need lightweight Python scanning
- Maintainers of Django, Flask, FastAPI, and AI-heavy codebases

## Positioning To Use

Keep the launch centered on one promise:

Skylos is the open source Python security and static analysis tool that finds dead code, security issues, and AI-generated regressions before they merge.

Do not lead with broad category language like "SAST platform" or enterprise-style claims. The strongest proof already in the repo is specific:
- diff-aware security regression detection
- dead code detection with published benchmark data
- AI defense scanning and provenance tracking
- real Python framework awareness

## Channel Strategy

### Owned

Use owned channels as the core of the launch. They already exist in the repo and can be shipped immediately:
- Homepage
- Blog
- Compare pages
- Use-case pages
- `llms.txt` and `llms-full.txt`
- In-product/dashboard surfaces for current users

Best owned assets to feature:
- `/blog/vibe-coding`
- `/blog/surviving-the-ai-pr-tsunami`
- `/blog/python-sast-comparison-2026`
- `/compare/bandit-vs-skylos`
- `/compare/deadcode-vs-vulture-vs-skylos`
- `/use-cases/ai-generated-code-security`
- `/use-cases/secure-github-actions-python`
- `/use-cases/python-security-github-actions`

### Rented

Use rented channels for short-term reach, then pull people back to owned assets:
- LinkedIn posts from founder and team
- X threads from founder
- Reddit posts in developer/security communities, only where the post genuinely helps
- Hacker News submission for a technical post or benchmark result

### Borrowed

Use borrowed channels only where the audience overlap is strong:
- GitHub repo mentions and community discussions
- Newsletter swaps with Python, AppSec, or AI engineering newsletters
- Podcast guest spots focused on AI engineering or AppSec
- Friend-of-founder amplification from engineers already using the tool

## Launch Asset Map

Use existing assets instead of creating a new narrative from scratch.

Proof and differentiation:
- `/compare/bandit-vs-skylos`
- `/compare/deadcode-vs-vulture-vs-skylos`
- `/compare/semgrep-vs-skylos`
- `/compare/snyk-vs-skylos`
- `/compare/sonarqube-vs-skylos`
- `/compare/bandit-vs-codeql-vs-semgrep-python`

Use-case landing pages:
- `/use-cases/ai-generated-code-security`
- `/use-cases/secure-github-actions-python`
- `/use-cases/python-security-github-actions`
- `/use-cases/detect-dead-code-python`

Educational / demand creation:
- `/blog/vibe-coding`
- `/blog/surviving-the-ai-pr-tsunami`
- `/blog/dead-code-security-liability`
- `/blog/sast-false-positives-what-works`
- `/blog/python-linting-deprecated-vscode`
- `/blog/fastapi-security-scanning-vulnerabilities-static-analysis`
- `/blog/django-security-scanning-what-static-analysis-catches`
- `/blog/flask-dead-code-case-study`
- `/blog/we-scanned-9-popular-python-libraries`
- `/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf`

Conversion surfaces:
- `/`
- `/vscode`
- `/llms.txt`
- `/llms-full.txt`

## 30-Day Sequence

### Week 1: Tighten the launch narrative

Goal: make the message obvious and credible before amplification.

Actions:
- Update homepage launch messaging to emphasize AI-generated code risk, dead code, and diff-aware security regression detection.
- Surface the strongest comparison and use-case pages in the homepage resource sections.
- Make sure every launch-facing page links to the primary CTA and the docs boundary between OSS and cloud.
- Refresh internal links so the launch content points to the new compare and use-case pages.

Who / channel:
- Founder
- Website
- Blog
- Homepage

Success criteria:
- Homepage CTA click-through rate increases
- Comparison and use-case page visits rise from homepage links
- At least 3 launch pages are linked prominently from the homepage

### Week 2: Publish the launch story

Goal: turn the best existing content into a coherent launch announcement.

Actions:
- Publish a launch post that explains the problem in plain language: AI writes code fast, but it also removes security controls and introduces dead code.
- Reuse the strongest benchmark and case-study claims already published on site.
- Turn that post into a LinkedIn post, X thread, and Hacker News submission draft.
- Add a short launch callout to the homepage and the relevant blog pages.

Who / channel:
- Founder-led content
- Blog
- LinkedIn
- X
- Hacker News

Success criteria:
- Launch post traffic from social and direct referrals
- Social engagement from developers who work on Python codebases
- New installs or repo stars attributable to launch posts

### Week 3: Borrow credibility

Goal: get third-party validation in front of the same audience.

Actions:
- Ask users, contributors, and friendly maintainers to share their experience with the tool.
- Reach out to one or two newsletter owners or podcast hosts that already cover Python, AppSec, or AI engineering.
- Submit the strongest technical asset to communities where detailed evidence is valued.
- Repost any proof points that generate replies or saves.

Who / channel:
- Borrowed audiences
- Newsletter
- Podcast
- Community posts

Success criteria:
- At least one external mention or reshare
- Referral traffic from borrowed channels
- More installs from people outside the existing audience

### Week 4: Convert attention into adoption

Goal: push interested users from curiosity to actual use.

Actions:
- Publish follow-up posts that show how to go from first scan to CI adoption.
- Highlight `skylos cicd init` as the next step after local scanning.
- Add a product update or changelog-style note for current users.
- Retarget the launch content with a recap post that points back to the install command.

Who / channel:
- Website
- Email to existing contacts
- Dashboard/in-product surfaces
- Social follow-up

Success criteria:
- More users complete a first scan
- More users move from scan to CI setup
- Launch traffic turns into recurring visits and installs

## Weekly Execution Details

### Week 1

- Focus: homepage, internal linking, and launch message
- Channel owner: founder plus web/content owner
- Main task: remove ambiguity and make the launch theme obvious in under 10 seconds
- Measure: homepage installs, click-through to compare/use-case pages, time on key pages

### Week 2

- Focus: one announcement post and one technical story
- Channel owner: founder
- Main task: write a launch post that reuses proof already on the site
- Measure: shares, comments, direct traffic, install intent

### Week 3

- Focus: borrowed reach
- Channel owner: founder plus anyone with relevant audience overlap
- Main task: get other people to say the same thing with their own words
- Measure: external mentions, referral traffic, new repo stars, newsletter clicks

### Week 4

- Focus: activation and adoption
- Channel owner: product and web owner
- Main task: turn launch interest into repeat usage and CI adoption
- Measure: first scans, CI setup completion, returning visitors, cloud credit purchases if applicable

## What To Deprioritize Right Now

Skip or delay these for this launch:
- Broad generic SEO terms like `python linter` or `SAST`
- Enterprise polish that outruns proof
- New channel expansion before the current assets convert
- Heavy paid acquisition
- New Product Hunt-style theatrics unless the listing and support base are already ready
- New collateral that duplicates existing comparison or use-case pages

The current content is already strong enough to launch with. The bottleneck is not content volume. It is focus, trust, and repeatable distribution.
