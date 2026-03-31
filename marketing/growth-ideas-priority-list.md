# Skylos Growth Ideas Priority List

This list is ranked for leverage plus fit with the assets already in the repo. I biased toward founder-executable work that can ship without new budget, new tooling, or a big team.

## Quick Wins

### 1. Turn the existing comparison content into a comparison hub sprint
Why it fits: comparison pages are already the strongest non-branded search wedge for Skylos, and they map directly to buyer intent.

Existing assets used: `src/content/compare/best-python-sast-tools-2026.mdx`, `src/content/compare/bandit-vs-skylos.mdx`, `src/content/compare/semgrep-vs-skylos.mdx`, `src/content/compare/snyk-vs-skylos.mdx`, `src/content/compare/sonarqube-vs-skylos.mdx`, `src/content/compare/deadcode-vs-vulture-vs-skylos.mdx`, `src/content/compare/bandit-vs-codeql-vs-semgrep-python.mdx`.

First steps:
- Refresh the main comparison pages with consistent proof blocks, internal links, and clear "when to use Skylos" sections.
- Add cross-links between all comparison pages so they reinforce one another.
- Surface the strongest comparison pages from the homepage and `/compare` entry point.

Expected outcome: higher search visibility on high-intent queries, better session depth, and more install intent from readers comparing tools.

Effort level: low to medium.

### 2. Use the VS Code migration angle as a traffic capture page
Why it fits: the repo already has signal around `python.linting` being deprecated, and the `/vscode` page is already getting impressions.

Existing assets used: `src/content/blog/python-linting-deprecated-vscode.mdx`, `src/app/vscode/page.tsx`, `src/content/blog/python-sast-comparison-2026.mdx`.

First steps:
- Make the blog post the canonical answer for `python.linting` migration intent.
- Add links from the blog post into the VS Code landing page and the main comparison article.
- Rework the `/vscode` page to emphasize the migration problem, not just Skylos as a product.

Expected outcome: more organic clicks from a clear editor-workflow query cluster and a cleaner path from education to install.

Effort level: low.

### 3. Publish the GitHub Actions security cluster as a workflow guide
Why it fits: GitHub Actions supply-chain risk is current, concrete, and directly aligned with Skylos' CI/security story.

Existing assets used: `src/content/use-cases/secure-github-actions-python.mdx`, `src/content/use-cases/python-security-github-actions.mdx`, `src/content/blog/vibe-coding.mdx`, `src/content/blog/surviving-the-ai-pr-tsunami.mdx`.

First steps:
- Treat the GitHub Actions use-case page as the primary workflow guide and make the blog content support it.
- Add specific examples around pinning by SHA, least privilege, and PR scanning.
- Link from the Python security scanner page so the cluster feels complete.

Expected outcome: stronger rankings on practical CI security queries and more trust from security-minded Python teams.

Effort level: low to medium.

### 4. Make dead-code detection a second authority cluster
Why it fits: dead code is a sharp problem Skylos already solves well, and it gives you a credible wedge into developer pain without overclaiming.

Existing assets used: `src/content/use-cases/detect-dead-code-python.mdx`, `src/content/compare/deadcode-vs-vulture-vs-skylos.mdx`, `src/content/blog/dead-code-security-liability.mdx`, `src/content/blog/flask-dead-code-case-study.mdx`, `src/content/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf.mdx`.

First steps:
- Build one dead-code narrative across use case, comparison, and case-study content.
- Add explicit framework-awareness and false-positive handling sections to every page in the cluster.
- Use the case-study posts as proof, not as standalone stories.

Expected outcome: better credibility with Python maintainers and more clicks from developers already searching for unused-code tools.

Effort level: low.

### 5. Turn existing benchmarks and case studies into founder-led social posts
Why it fits: the repo already has proof points, and developers respond to evidence more than brand polish.

Existing assets used: `src/content/blog/we-scanned-9-popular-python-libraries.mdx`, `src/content/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf.mdx`, `src/content/blog/sast-false-positives-what-works.mdx`, `src/content/blog/vibe-coding.mdx`, `src/app/page.tsx`.

First steps:
- Extract one claim, one chart, or one example from each proof-heavy post.
- Post them as short threads/posts on X, LinkedIn, and relevant dev communities.
- Link each post back to the original article or homepage proof section.

Expected outcome: more qualified traffic, more repeat exposure, and a stronger "this product is real" signal.

Effort level: low.

## Compounding Bets

### 6. Ship every new article as a mini-launch
Why it fits: Skylos does not need one giant launch moment; it needs repeated, proof-heavy launch moments that compound.

Existing assets used: all current blog, compare, and use-case pages, plus the homepage resources section in `src/app/page.tsx`.

First steps:
- For each new page, prepare one homepage update, one social post, one internal link pass, and one community post.
- Treat publish day like a small launch with a clear CTA to install or read the next relevant page.
- Reuse the same launch checklist every time so the process stays lightweight.

Expected outcome: steadier traffic, better content utilization, and a repeatable launch rhythm without creating a bigger team.

Effort level: medium.

### 7. Expand the comparison map programmatically around adjacent tool searches
Why it fits: Skylos is already competitive in comparison-intent searches, and that is the most scalable SEO lane in the repo.

Existing assets used: `src/content/compare/bandit-vs-codeql-vs-semgrep-python.mdx`, `src/content/compare/bandit-vs-skylos.mdx`, `src/content/compare/semgrep-vs-skylos.mdx`, `src/content/compare/snyk-vs-skylos.mdx`, `src/content/compare/sonarqube-vs-skylos.mdx`, `src/content/compare/best-python-sast-tools-2026.mdx`.

First steps:
- Identify adjacent comparison terms already implied by the current pages.
- Publish only the pages that map to real buyer intent, not generic "best tool" terms.
- Keep a strict internal-link template so new pages strengthen the whole cluster.

Expected outcome: more long-tail rankings, more entry points, and less dependence on brand searches.

Effort level: medium.

### 8. Build a maintainer and open-source PR flywheel
Why it fits: Skylos already has proof from merged cleanup PRs, which is rare and credible for a devtool.

Existing assets used: `src/content/blog/3-merged-prs-dead-code-in-black-flagsmith-pypdf.mdx`, `src/content/blog/flask-dead-code-case-study.mdx`, `src/content/blog/we-scanned-9-popular-python-libraries.mdx`.

First steps:
- Use the existing merged-PR stories as the basis for outreach to active Python repos.
- Keep a public log of notable cleanup wins and link it back into the content cluster.
- Turn each successful PR into a short post or case study.

Expected outcome: stronger authority, more social proof, and a repeatable source of credibility with the exact audience you want.

Effort level: medium.

### 9. Use community distribution where the proof is strongest
Why it fits: the product is technical enough that the right communities will reward evidence, not generic marketing.

Existing assets used: `src/content/blog/sast-false-positives-what-works.mdx`, `src/content/blog/vibe-coding.mdx`, `src/content/blog/surviving-the-ai-pr-tsunami.mdx`, `src/content/use-cases/ai-generated-code-security.mdx`.

First steps:
- Post one highly specific takeaway per community instead of blasting the same pitch everywhere.
- Aim at Reddit, Hacker News, and developer Slack/Discord groups where AI coding and Python security are already discussed.
- Use the original article as the source of truth and avoid marketing language in the post itself.

Expected outcome: occasional spikes of very qualified attention and a better chance of earning backlinks or discussion.

Effort level: low to medium.

### 10. Create a lightweight proof pack for founder-led outreach
Why it fits: the repo already contains enough evidence to support direct outreach to teams using AI coding assistants.

Existing assets used: `src/app/page.tsx`, `src/content/blog/we-scanned-9-popular-python-libraries.mdx`, `src/content/blog/vibe-coding.mdx`, `src/content/use-cases/ai-generated-code-security.mdx`, `src/content/compare/deadcode-vs-vulture-vs-skylos.mdx`.

First steps:
- Extract 3 to 5 proof bullets from the homepage and benchmark/case-study posts.
- Use those bullets in targeted outreach to startups shipping code with Cursor, Copilot, or Claude Code.
- Point prospects to the exact article or comparison page that matches their problem.

Expected outcome: warmer replies, better founder-led sales conversations, and a tighter loop between proof and conversion.

Effort level: low.

## Skip For Now

- Broad paid ads. The positioning is still proof-led, and the search/content motion is stronger than paid acquisition right now.
- Generic top-of-funnel topics like `python linter` or `SAST`. The repo itself says the win is in narrower workflow intent.
- Big-brand launch stunts. Skylos is better served by repeated evidence-led launches than by one noisy event.
- Enterprise-heavy PR or conference campaigns. They are slower, more expensive, and weaker than the current content wedge.
