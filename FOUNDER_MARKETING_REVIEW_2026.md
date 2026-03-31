# Founder and Marketing Review

Date: March 12, 2026

## Blunt opinion

Skylos looks like a real product, not a fake project. That is already a meaningful advantage.

But the website still feels ahead of the proof.

The product positioning is promising, the topic space is strong, and the early SEO signals are real. At the same time, the site still has a trust gap:

- some claims feel bigger than the evidence currently shown
- the docs experience is weak
- the homepage is trying to sell before it has fully proven itself
- the product story is still split across too many angles at once

If I were looking at this as a founder, I would say:

- you are not too early to market
- you are too early to over-market

That is the core issue.

Right now, the best path is not to make the site louder. It is to make it more credible, sharper, and more specific.

## The good news

You have several things going for you already:

- The niche is clear: Python security, dead code, CI, AI-generated code verification.
- The site already has organic visibility despite being about one month old.
- The comparison and use-case content direction is correct.
- The product appears technically real, which matters a lot in this category.
- The repo has enough substance that content can be backed by actual product capability.

This is not a branding problem first. It is a trust, clarity, and proof problem.

## The hard truth

The current site still reads like a company trying to sound bigger than it is.

That is dangerous for a developer tool.

Developer audiences are unusually sensitive to:

- inflated claims
- vague category language
- placeholder docs
- unclear pricing boundaries
- enterprise language without visible substance

If a developer feels even a small credibility wobble, they leave.

This matters more for Skylos because the space is crowded with established names like Bandit, Semgrep, CodeQL, Ruff, Vulture, Sonar, and many others. A new entrant does not get to borrow trust. It has to earn it line by line.

## What is working

### 1. The topic selection is strong

The content direction is good. You are not writing random SEO filler. You are writing about:

- Python SAST
- dead code detection
- GitHub Actions security
- AI-generated code verification
- tool comparisons

Those topics fit the product and can compound over time.

### 2. The site is understandable

A visitor can tell this is about Python static analysis and security. That is a win. Many early-stage devtool sites fail even that.

### 3. The comparison strategy is right

The strongest growth opportunity is comparison and use-case content, not broad homepage terms. That direction is correct and should continue.

### 4. The VS Code angle is useful

The VS Code page gives you another discovery surface and another conversion path. That is valuable because some developers will discover the product through editor workflow, not CI workflow.

## What is hurting you

### 1. The docs undermine trust

This is the biggest credibility problem on the site.

The current docs page literally says:

`Replace this page with your real docs later.`

That kind of placeholder copy is fatal for trust.

A developer evaluating a security tool expects:

- installation instructions
- command reference
- example output
- configuration docs
- CI examples
- clear open-source vs paid boundaries

If the docs are thin or visibly unfinished, the entire company feels unfinished.

### 2. The homepage is too broad and too polished relative to proof

The homepage design is visually strong, but parts of it feel more polished than substantiated.

Examples:

- `SOC2 ready`
- `5000+ vulnerabilities caught`
- `1000+ hours saved`
- `85% accuracy rate`
- enterprise-style promises around SSO, SLA, compliance reports

None of these are inherently bad if they are true and provable. But if they are not backed by visible evidence, they weaken trust rather than increase it.

For devtools, proof beats polish.

### 3. The product message is still slightly fuzzy

Skylos is trying to be several things at once:

- Python security scanner
- dead code detector
- static analysis tool
- CI quality gate
- AI code verifier
- VS Code assistant

All of these can be true, but the homepage needs one primary message.

Right now, the clearest one is:

`Framework-aware Python static analysis for dead code, security, and AI-generated code verification.`

That is sharper than generic phrases like:

- secure your Python before you ship
- static analysis that finds dead code, secrets, and vulnerabilities

The current version is decent, but it still sounds category-level. It needs to sound more differentiated.

### 4. The main CTA is a little too ambitious for cold traffic

`Connect GitHub` is a reasonable CTA for warm users.

It is not the best default CTA for a first-time visitor landing from search.

Cold visitors usually want one of these first:

- see proof
- install locally
- read docs
- understand pricing

Making login or GitHub connection the dominant action too early can lower conversion because it asks for commitment before enough trust has been built.

### 5. The site needs more visible authorship and methodology

Google's current people-first content guidance emphasizes:

- who created the content
- how the content was created
- why the content exists

Your articles are on the right path, but they need more visible trust markers:

- clear author/byline
- explicit benchmark methodology
- links to reproduction steps
- screenshots, command output, or benchmark repos

For content in this category, firsthand evidence matters more than word count.

## My honest founder-level diagnosis

If this were my company, I would describe the situation like this:

`The product story is ahead of the trust story.`

That is fixable.

You do not need a rebrand.

You do not need a new design system.

You do not need more feature pages first.

You need:

- stronger proof
- better docs
- tighter messaging
- cleaner conversion flow
- more evidence-heavy content

## The biggest strategic mistake to avoid

Do not try to look like a large enterprise platform yet.

That is the wrong game right now.

You will be more believable and more effective if the site feels like:

- a sharp technical tool built by someone who deeply understands Python codebases
- with serious benchmarks
- clear documentation
- honest tradeoffs

That is how you beat larger incumbents early.

You win with specificity, not with corporate polish.

## What I would change first

### Priority 1: Fix trust leaks

Do these before trying to scale traffic.

#### A. Replace the docs placeholder immediately

What to do:

1. Create a real docs experience with at least:
   - install
   - quickstart
   - scan modes
   - example findings
   - CI setup
   - VS Code setup
   - pricing and cloud boundary
2. If docs already exist on `docs.skylos.dev`, make `/docs` redirect there instead of showing a placeholder page.
3. Add one page called `How Skylos Works` that explains:
   - dead code detection
   - framework awareness
   - taint analysis
   - AI code verification patterns

Success condition:

- a first-time visitor can understand the tool and try it without emailing you

#### B. Remove or prove every big claim

What to do:

1. Audit every homepage claim.
2. For each claim, choose one of three actions:
   - keep and link proof
   - rewrite to something narrower and honest
   - remove

Claims that need proof or revision:

- `5000+ vulnerabilities caught`
- `1000+ hours saved`
- `85% accuracy rate`
- `SOC2 ready`
- pricing-plan promises that imply mature enterprise delivery

Success condition:

- every strong claim either has visible proof or is rewritten conservatively

#### C. Add visible proof sections

What to do:

1. Add a homepage section called `Proof` or `Benchmarks`.
2. Put in:
   - one Flask benchmark
   - one FastAPI or Django benchmark
   - one AI-generated code example
   - one CLI output screenshot
3. Link each proof block to a deeper article or benchmark page.

Success condition:

- a skeptical engineer can see evidence within 20 seconds of landing

### Priority 2: Tighten the product message

#### Recommended positioning

Use one main sentence consistently:

`Skylos is a framework-aware Python static analysis tool that finds dead code, security issues, and AI-generated code mistakes.`

Use one supporting sentence:

`Run it locally, in GitHub Actions, or inside VS Code.`

What to do:

1. Rewrite the homepage hero to emphasize:
   - Python
   - framework-aware analysis
   - dead code + security + AI verification
2. Reduce generic language like `secure your Python before you ship`.
3. Keep the category words users actually search for:
   - Python static analysis
   - Python security scanner
   - dead code detection
   - GitHub Actions
   - VS Code

Success condition:

- the product is understandable in one screen without scrolling

### Priority 3: Fix the CTA ladder

Right now the site jumps quickly to login and GitHub connection.

A better conversion ladder is:

1. read proof
2. install locally
3. read docs
4. connect GitHub
5. book demo

What to do:

1. Make `Install CLI` or `Try locally` the primary CTA for cold traffic sections.
2. Keep `Connect GitHub` for sections aimed at teams or CI users.
3. Use `Book a Demo` only where enterprise intent is more likely.
4. Add a lightweight CTA near proof-heavy sections:
   - `Run on your repo`
   - `See example output`

Success condition:

- the site feels easier to try and less demanding up front

### Priority 4: Turn content into proof, not just traffic

The content should not just attract impressions. It should close trust.

What to do for every serious article:

1. Add:
   - clear author/byline
   - publish date and updated date
   - benchmark method
   - command examples
   - screenshots or output snippets
   - related pages
2. Prefer:
   - comparisons
   - use cases
   - benchmark writeups
   - workflow guides
3. Avoid:
   - generic thought leadership
   - broad AI commentary with no reproducible technical angle

Success condition:

- every article helps both ranking and conversion

### Priority 5: Clarify open source vs paid

This is a common early-stage devtool confusion point.

If someone lands on Skylos, they should understand:

- what is free
- what is local
- what requires login
- what uses credits
- what is cloud-only
- what is enterprise-only

What to do:

1. Add a plain-language comparison table:
   - OSS CLI
   - cloud dashboard
   - GitHub integration
   - VS Code extension
   - AI-assisted features
2. Put this in docs and pricing.
3. Remove ambiguity around credits and local scans.

Success condition:

- a visitor does not need to guess which features are paid

## Clear action plan

## Week 1

### Goal

Remove the biggest trust problems.

### Tasks

1. Replace the `/docs` placeholder with real docs or redirect to real docs.
2. Audit and rewrite all unsupported claims on the homepage.
3. Add one proof section to the homepage with links to:
   - Flask benchmark
   - dead code guide
   - AI-generated code guide
4. Rewrite the hero around the clearer positioning statement.

### Deliverables

- better homepage trust
- no obvious placeholder content
- clearer positioning

## Week 2

### Goal

Improve conversion quality.

### Tasks

1. Change CTA hierarchy:
   - primary: install locally
   - secondary: read docs
   - tertiary: connect GitHub
2. Add an `open source vs cloud` comparison block.
3. Add one visible example output block on the homepage.
4. Add a short `How Skylos works` block or page.

### Deliverables

- visitors can try the tool faster
- lower confusion
- more believable funnel

## Week 3

### Goal

Strengthen authority with proof-heavy content.

### Tasks

1. Publish one benchmark-driven comparison page.
2. Publish one workflow-specific use-case page.
3. Add author and methodology sections to your strongest existing articles.
4. Link those articles from the homepage and compare hub.

### Deliverables

- stronger non-branded traffic base
- better trust on technical readers

## Week 4

### Goal

Add distribution instead of only publishing.

### Tasks

1. Turn each article into:
   - one GitHub discussion or repo reference where relevant
   - one X thread
   - one short dev-focused post
   - one product update post
2. Share only evidence-heavy posts, not generic launch posts.
3. Track which pieces lead to:
   - GitHub stars
   - installs
   - signups
   - branded search growth

### Deliverables

- distribution with better signal
- feedback from real users

## Exact suggestions for the homepage

### Hero

Current problem:

- strong design
- decent copy
- not differentiated enough

Replace the current hero idea with something closer to:

`Framework-aware Python static analysis`

`Find dead code, security issues, and AI-generated code mistakes before merge.`

Supporting line:

`Run locally, in GitHub Actions, or in VS Code.`

Primary CTA:

- `Install CLI`

Secondary CTA:

- `See example output`

Third CTA:

- `Connect GitHub`

### Proof block

Add a block with three cards:

- `Flask benchmark`
- `Dead code benchmark`
- `AI-generated code example`

Each card should show:

- one result
- one screenshot or code sample
- one link to deeper proof

### Claims block

If you keep metrics like:

- vulnerabilities caught
- hours saved
- accuracy rate

then add a `How we measured this` link directly below them.

If you cannot prove them publicly, remove them.

### Pricing

Current problem:

- pricing exists
- trust and docs are not yet strong enough
- plan boundaries may not be obvious

What to do:

1. Add `Who this is for` under each plan.
2. Add `What requires credits`.
3. Add `What stays free and local`.
4. Remove anything that feels enterprise-heavy unless it is truly deliverable today.

## Content suggestions

## Content that will help

- benchmark comparisons
- migration guides
- workflow guides
- CI hardening + scanning guides
- dead code cleanup case studies
- AI verification examples with real bad code and corrected code

## Content that will hurt

- generic `why AI is changing software`
- generic `best coding tools`
- vague `future of AppSec`
- articles written mainly to capture traffic without firsthand evidence

## For each new article, follow this checklist

1. Start with a real problem.
2. Show a real command.
3. Show real output.
4. Explain what the tool did better or differently.
5. Show the tradeoff honestly.
6. Add internal links to:
   - compare
   - use case
   - install/docs
7. Add a clear next step:
   - try locally
   - run in CI
   - compare on your repo

## Distribution instructions

Do not rely on SEO alone.

Every good article should also be distributed manually.

### How to distribute each strong article

1. Write one short post that summarizes the result.
2. Lead with the finding, not the product.
3. Include one screenshot or code snippet.
4. Link the article only after the evidence.
5. Post in places where the problem already exists, not generic startup spaces.

Good targets:

- Python developer communities
- AppSec communities
- GitHub issues or discussions where the topic is directly relevant
- dev-focused social channels

Bad targets:

- generic `check out my startup` posts
- broad promotional launch spam
- communities where you have no problem-specific context

## Metrics to track

Do not obsess over total traffic yet.

Track:

- non-branded impressions
- non-branded clicks
- installs
- GitHub stars
- docs visits
- compare-page CTR
- article-to-signup conversion
- article-to-install conversion

Add a simple weekly review:

1. Which page got the most non-branded impressions?
2. Which page got the most clicks?
3. Which page produced the most installs or signups?
4. Which claims or CTAs seem to be ignored?

## What not to do

- Do not buy ads yet.
- Do not hire an SEO agency yet.
- Do not publish broad filler content.
- Do not hide pricing complexity behind vague credit language.
- Do not keep claims that you cannot defend.
- Do not make the site sound more mature than the product experience.

## The smartest version of Skylos right now

The best version of this company in the next 60 days is not:

- a broad enterprise AppSec platform
- an all-purpose AI coding company
- a generic code quality brand

It is:

`the most credible framework-aware Python analysis tool for dead code, security, and AI-generated code verification`

That is specific enough to win.

## Final recommendation

If you only do five things, do these:

1. Replace the docs placeholder immediately.
2. Remove or prove every large homepage claim.
3. Rewrite the hero around a sharper, more differentiated positioning statement.
4. Make proof and install more prominent than login.
5. Publish more benchmark-heavy comparison content and distribute it manually.

## Founder operating rhythm

The next step is not another homepage redesign.

The next step is to run a repeatable proof-and-distribution loop.

For the next 2 weeks, focus on:

1. adding visual proof to the strongest pages
2. instrumenting the funnel so you know what content actually converts
3. publishing one more evidence-heavy page
4. tightening docs around local vs cloud vs credits vs login

## Daily tasks

Do these every working day:

1. Spend 15 minutes reviewing signal:
   - top landing pages
   - docs clicks
   - install intent
   - signups
   - which articles move people deeper
2. Improve one proof asset:
   - screenshot
   - CLI output block
   - benchmark chart
   - methodology note
   - CTA copy
3. Do one distribution action:
   - LinkedIn post
   - Reddit/community reply
   - GitHub discussion or issue comment where relevant
4. Talk to one real user or prospect:
   - reply to a comment
   - send one DM
   - answer one email
   - ask one person what confused them
5. Fix one trust leak:
   - vague claim
   - weak proof block
   - confusing pricing sentence
   - thin docs step
   - missing internal link

## Monday to Friday checklist

### Monday

Goal:
review signal and pick the week's proof asset

Tasks:

1. Check Search Console and site analytics.
2. Identify:
   - top non-branded landing page
   - highest CTR content page
   - weakest proof-heavy page
3. Decide one main content asset for the week:
   - benchmark
   - comparison
   - workflow guide
4. Write a short outline and define the conversion goal:
   - install
   - docs click
   - signup

### Tuesday

Goal:
improve proof on existing pages

Tasks:

1. Add one visual proof element to an existing page.
2. Add one better CTA near proof:
   - install locally
   - see docs
   - connect GitHub
3. Improve one docs section that supports the same page.
4. Add internal links from homepage, compare, blog, or use cases.

### Wednesday

Goal:
publish or substantially advance one evidence-heavy page

Tasks:

1. Write the draft.
2. Include:
   - author/byline
   - updated date
   - methodology
   - commands
   - screenshots or output
3. Make sure the page ends with a clear CTA.
4. Link it from the most relevant existing pages.

### Thursday

Goal:
distribute the proof, not just the page

Tasks:

1. Turn the page into 3 to 5 small distribution units:
   - one chart
   - one surprising stat
   - one command snippet
   - one short conclusion
2. Post in developer-relevant channels.
3. Reply to comments and questions the same day.
4. Note which angle gets the best response.

### Friday

Goal:
learn what actually worked

Tasks:

1. Review:
   - impressions
   - clicks
   - docs visits
   - installs
   - signups
   - stars
2. Identify:
   - highest-signal page
   - weakest CTA
   - most believable proof block
   - biggest remaining trust leak
3. Write next week's top 3 priorities.

## Weekly output target

A reasonable weekly target right now is:

1. 1 new proof-heavy article or major update
2. 3 to 5 distribution posts derived from it
3. 3 real user conversations
4. 1 funnel review with edits shipped
5. 1 docs improvement pass

## Weekly scoreboard

Track these every Friday:

1. Which page got the most non-branded impressions?
2. Which page got the most clicks?
3. Which page drove the most installs?
4. Which page drove the most signups?
5. Which CTA underperformed?
6. Which trust leak still shows up in user feedback?

## Supporting research

The recommendations above are consistent with:

- Google's current people-first content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google's title link guidance: https://developers.google.com/search/docs/appearance/title-link
- Google's guidance on site name consistency: https://developers.google.com/search/docs/appearance/site-names
- VS Code's current Python and linting guidance: https://code.visualstudio.com/docs/languages/python
- VS Code deprecation note for `python.linting.*`: https://code.visualstudio.com/updates/v1_84
- GitHub Actions secure use guidance: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub guidance on `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token
- GitHub secrets guidance: https://docs.github.com/en/actions/concepts/security/secrets
- Sonar's January 8, 2026 survey on AI code verification: https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/
