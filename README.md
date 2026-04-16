# Skylos Cloud

Skylos Cloud is the Next.js web application for Skylos, an open source Python static-analysis and security product focused on:

- Python static analysis
- dead code detection
- Python security scanning
- GitHub Actions workflows
- AI-generated code review

This repo contains the public website, comparison pages, use-case content, blog content, AI-facing `llms.txt` routes, and the authenticated dashboard experience.

## What Is In This Repo

- marketing pages for Skylos
- SEO and AI-indexing content under `src/content/blog`, `src/content/compare`, and `src/content/use-cases`
- sitemap, robots, RSS, `llms.txt`, and `llms-full.txt` routes
- dashboard pages for scans, issues, billing, compliance, and project settings
- Supabase-backed auth and application data

## Core URLs In The App

- `/` homepage
- `/blog` research and benchmark articles
- `/compare` Python tool comparisons
- `/use-cases` workflow guides
- `/judge` public repository scorecards
- `/judge/submit` Judge operator import surface
- `/vscode` VS Code landing page
- `/llms.txt` compact AI-facing site summary
- `/llms-full.txt` expanded AI-facing page inventory

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment Notes

The app expects Supabase credentials and site configuration through environment variables such as:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `JUDGE_ADMIN_TOKEN` for Judge seed/import admin routes

Some pages also use optional integrations such as GitHub and Lemon Squeezy.

## Content Model

Public SEO content is authored as MDX:

- `src/content/blog`
- `src/content/compare`
- `src/content/use-cases`

Those collections power:

- page rendering
- metadata and structured data
- XML sitemap generation
- RSS feed generation
- AI-facing `llms.txt` inventory routes

## Why This Repo Exists

The public site is intentionally optimized around high-intent Python search themes instead of broad generic devtool terms. The strongest topics in the repo are:

- dead code detection in Python
- Python security scanning in GitHub Actions
- AI-generated Python code verification
- Bandit, Semgrep, CodeQL, Snyk, SonarQube, and Vulture comparisons
- VS Code Python linting and editor workflows

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase
- MDX content rendering

## License

See [License](./License).
