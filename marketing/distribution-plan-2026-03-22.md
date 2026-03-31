# Skylos Distribution Plan

Date: 2026-03-22

## Goal

Get qualified traffic from proof-heavy distribution, not broad awareness posting.

Primary outcomes:

- more `marketing_page_view` events from technical communities
- more visits to proof pages, not just the homepage
- more installs and GitHub stars from readers who already feel the problem

## Operating Rules

1. Post only technical artifacts:
   - benchmarks
   - workflow guides
   - concrete failure modes
   - repo cleanup wins
2. Do not send cold traffic to the generic homepage when a tighter page exists.
3. Do not post the same copy everywhere.
4. Skip Instagram for now.
5. Use UTM links on every community post.

## Link Convention

Use:

`?utm_source=<platform>&utm_medium=<channel>&utm_campaign=<topic_slug>`

Examples:

- Reddit community post:
  `/use-cases/ai-security-regressions-in-prs?utm_source=reddit&utm_medium=community&utm_campaign=ai_security_regressions`
- LinkedIn founder post:
  `/blog/we-scanned-9-popular-python-libraries?utm_source=linkedin&utm_medium=social&utm_campaign=python_repo_scan_benchmark`

## The 5 Post Ideas

### 1. AI removed an auth decorator and code review missed it

- Why this works: sharp, scary, easy to understand, strongly differentiated
- Primary channels: LinkedIn, X, Reddit, HN only if framed as a technical artifact
- Landing page: `/use-cases/ai-security-regressions-in-prs`
- Backup landing page: `/compare/snyk-vs-skylos`
- CTA: `See the exact regression patterns Skylos catches`

### 2. We scanned 9 popular Python libraries and measured dead-code accuracy

- Why this works: strongest pure proof asset
- Primary channels: LinkedIn, X, Reddit, dev communities
- Landing page: `/blog/we-scanned-9-popular-python-libraries`
- Backup landing page: `/compare/deadcode-vs-vulture-vs-skylos`
- CTA: `See the benchmark and methodology`

### 3. Vulture vs Skylos on framework-heavy Python repos

- Why this works: captures active evaluation intent
- Primary channels: Reddit, X, founder outreach follow-ups
- Landing page: `/compare/deadcode-vs-vulture-vs-skylos`
- Backup landing page: `/blog/flask-dead-code-case-study`
- CTA: `Compare false positives and recall`

### 4. What most scanners miss when AI refactors Python code

- Why this works: category creation without being vague
- Primary channels: LinkedIn, X, dev Slack/Discord groups
- Landing page: `/use-cases/ai-generated-code-security`
- Backup landing page: `/compare/semgrep-vs-skylos`
- CTA: `Review the failure modes before merge`

### 5. Secure GitHub Actions in Python without slowing PRs down

- Why this works: practical workflow content with clear security value
- Primary channels: LinkedIn, Reddit, GitHub discussions, security groups
- Landing page: `/use-cases/secure-github-actions-python`
- Backup landing page: `/use-cases/python-security-github-actions`
- CTA: `Use the workflow guide`

## Two-Week Cadence

### Week 1

#### Day 1

- Ship post idea 1 on LinkedIn and X
- Share a Reddit version tailored to one Python or AI-coding community
- Watch comments for objections and questions to reuse later

#### Day 2

- Turn the best comment or objection from Day 1 into a short follow-up post
- Reply to everyone who asked for examples with the use-case page

#### Day 3

- Ship post idea 2 on LinkedIn and X
- Send the benchmark page to 10 hand-picked prospects already using Cursor, Copilot, or Claude Code

#### Day 4

- Repurpose one benchmark chart or stat into a short visual post
- Add one internal homepage link to the benchmark if it is not already prominent enough

#### Day 5

- Ship post idea 3 in Reddit or dev communities where tool comparison is acceptable
- Review `marketing_page_view` data by `utm_source`, `utm_campaign`, and `page_path`

### Week 2

#### Day 6

- Ship post idea 4 on LinkedIn and X
- Repost the strongest Week 1 artifact with a new hook, not the same copy

#### Day 7

- Turn one high-signal comment into a mini FAQ or short post
- Update the destination page if readers are confused by any claim

#### Day 8

- Ship post idea 5 in workflow/security communities
- DM or email 10 qualified people with the workflow guide if it matches their stack

#### Day 9

- Publish one founder note summarizing:
  - which angle got clicks
  - which angle got comments
  - which angle got installs or stars

#### Day 10

- Review what actually moved:
  - top campaign by page views
  - top landing page by engagement quality
  - posts that produced stars, installs, or replies
- Double down on the best angle for the next 2 weeks

## Channel Notes

### LinkedIn

- Use a strong first line and one concrete failure mode
- Keep links in the post only if the post still reads naturally
- Good for founder-led proof and benchmark narratives

### X

- Use a short contrarian or evidence-led opener
- Threads are fine only if each tweet earns its place
- Best for quick proof snippets and benchmark findings

### Reddit

- Lead with the technical finding, not the product
- Include enough detail that the post stands on its own
- Link once, only when it clearly helps

### Hacker News

- Only use when you have a technical artifact, benchmark, repo, or reproducible workflow
- Do not submit a generic launch or sales angle

## Measurement

Now that public page-view attribution is in place, review:

- `event_type = marketing_page_view`
- `metadata.utm_source`
- `metadata.utm_campaign`
- `metadata.page_path`
- `metadata.referrer_host`

Immediate success signal:

- one or two campaigns start generating identifiable technical traffic

Next implementation after this:

- CTA click tracking for homepage and content-page install/get-started buttons
- first-touch attribution attached to signup and project creation events
