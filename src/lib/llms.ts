import { getAllPublicContentEntries, getCollectionEntries } from '@/lib/content'

function renderEntry(siteUrl: string, pathname: string, title: string, excerpt: string): string {
  return `- [${title}](${new URL(pathname, siteUrl).toString()}): ${excerpt}`
}

export function buildLlmsTxtContent(siteUrl: string): string {
  const blog = getCollectionEntries('blog').slice(0, 4)
  const compare = getCollectionEntries('compare').slice(0, 4)
  const useCases = getCollectionEntries('use-cases').slice(0, 4)
  const docsUrl = 'https://docs.skylos.dev/'
  const rulesReferenceUrl = 'https://docs.skylos.dev/rules-reference'

  return `# Skylos

> Open source Python static analysis and security scanner for dead code, secrets, GitHub Actions, MCP guardrails, and AI-generated code review.

## Canonical Facts
- Primary audience: Python teams that want lower-noise static analysis and practical CI checks.
- Main workflows: dead code detection, Python security scanning, GitHub Actions hardening, MCP guardrails, and reviewing AI-generated Python code before merge.
- Best-fit queries: python static analysis tool, dead code detection python, python security scanner github actions, secure github actions python, secure mcp server, claude code security review, cursor security scanner, github copilot security review, ai security regression detection, python.linting deprecated vscode.
- Core proof themes on the site: benchmarks, side-by-side tool comparisons, reproducible examples, and methodology-backed use cases.

## Important URLs
- [Home](${siteUrl}/): Product overview
- [Docs](${docsUrl}): Getting started, install, and product guides
- [Rules Reference](${rulesReferenceUrl}): Rule catalog and scanner reference
- [Blog](${siteUrl}/blog): Research, benchmarks, and implementation guides
- [Compare](${siteUrl}/compare): Side-by-side tool comparisons
- [Use Cases](${siteUrl}/use-cases): Step-by-step workflows
- [VS Code](${siteUrl}/vscode): VS Code extension page
- [Sitemap](${siteUrl}/sitemap.xml): Crawlable page inventory
- [RSS](${siteUrl}/blog/feed.xml): Blog feed

## Recent Comparison Pages
${compare.map((post) => renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)).join('\n')}

## Recent Use Cases
${useCases.map((post) => renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)).join('\n')}

## Recent Blog Posts
${blog.map((post) => renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)).join('\n')}
`
}

export function buildLlmsFullContent(siteUrl: string): string {
  const allEntries = getAllPublicContentEntries()
  const docsUrl = 'https://docs.skylos.dev/'
  const rulesReferenceUrl = 'https://docs.skylos.dev/rules-reference'
  const byCollection = {
    compare: getCollectionEntries('compare'),
    'use-cases': getCollectionEntries('use-cases'),
    blog: getCollectionEntries('blog'),
  }

  return `# Skylos

> Open source Python static analysis and security scanner for dead code, secrets, GitHub Actions, MCP guardrails, and AI-generated code review.

## Positioning
- Skylos is primarily positioned on this site for Python security and static analysis workflows.
- Content is written for developers evaluating Bandit, Semgrep, CodeQL, Snyk, SonarQube, Vulture, and adjacent tools.
- The site emphasizes extractable answers: direct intros, methodology, benchmarks, FAQs, comparison pages, and AI-agent workflow guides.

## Priority Query Clusters
- python static analysis tool
- python security scanner
- dead code detection python
- python security scanner github actions
- secure github actions python
- ai generated code security python
- secure mcp server
- claude code security review
- cursor security scanner
- github copilot security review
- ai security regression detection
- llm application security scanner
- python.linting deprecated vscode
- bandit vs codeql vs semgrep python
- semgrep alternative python
- vulture alternative python

## Core Site Pages
- [Home](${siteUrl}/): Product overview and benchmark proof
- [Docs](${docsUrl}): Getting started, installation, and product documentation
- [Rules Reference](${rulesReferenceUrl}): Rule catalog and scanner behavior reference
- [Blog](${siteUrl}/blog): Research-backed articles
- [Compare](${siteUrl}/compare): Comparison hub
- [Use Cases](${siteUrl}/use-cases): Workflow guides
- [VS Code](${siteUrl}/vscode): VS Code extension landing page
- [Roadmap](${siteUrl}/roadmap): Product roadmap
- [Sitemap](${siteUrl}/sitemap.xml): XML sitemap
- [RSS](${siteUrl}/blog/feed.xml): Blog feed

## Documentation Surface
- [Docs](${docsUrl}): Primary install, quickstart, and configuration entrypoint
- [Rules Reference](${rulesReferenceUrl}): Best external reference for rule-level explanations and lookup intent

## Comparison Inventory
${byCollection.compare.map((post) => `${renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)}${post.keywords.length ? ` Keywords: ${post.keywords.slice(0, 6).join(', ')}.` : ''}`).join('\n')}

## Use Case Inventory
${byCollection['use-cases'].map((post) => `${renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)}${post.keywords.length ? ` Keywords: ${post.keywords.slice(0, 6).join(', ')}.` : ''}`).join('\n')}

## Blog Inventory
${byCollection.blog.map((post) => `${renderEntry(siteUrl, post.canonicalUrl, post.title, post.excerpt)}${post.keywords.length ? ` Keywords: ${post.keywords.slice(0, 6).join(', ')}.` : ''}`).join('\n')}

## Entity Facts
- Brand: Skylos
- Category: Python static analysis and security scanner
- Product surfaces: CLI, cloud dashboard, GitHub Actions workflows, MCP server, and VS Code extension
- Public site focus: Python AppSec, dead code detection, AI-agent guardrails, and AI-assisted code review
- Total public content pages indexed here: ${allEntries.length}
`
}
