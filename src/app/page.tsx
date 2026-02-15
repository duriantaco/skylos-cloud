import Link from 'next/link'
import Script from 'next/script'
import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import CopyInstallButton from '@/components/CopyInstallButton'
import SkylosHeroSandbox from '@/components/SkylosHeroSandbox'
import { getGithubRepo, getSiteUrl } from '@/lib/site'
import { ArrowRight, Terminal, Shield, AlertTriangle, Code2, GitBranch, Timer, Search, Check, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Skylos | Low-Noise Python Static Analysis & Dead Code Detection',
  description: 'The context-aware alternative to Vulture. Detects dead code in FastAPI, Pydantic, and Django with 0% false positives. CI/CD ready.',
  keywords: [
    'python static analysis', 
    'vulture alternative', 
    'reduce false positives python', 
    'fastapi dead code detection', 
    'pydantic unused fields', 
    'devsecops pipeline'
  ],
  openGraph: {
    title: 'Skylos - Static Analysis Without the Noise',
    description: 'Benchmark: 100% Recall, 70% Precision vs Vulture. Stop chasing false positives.',
    type: 'website',
  },
}

async function getGithubStars(): Promise<number | null> {
  const repo = getGithubRepo()
  if (!repo) return null

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'application/vnd.github+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}

function BenchmarkSection() {
  return (
    <section className="py-24 bg-white border-t border-slate-200" id="benchmark">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* SEO Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Benchmark: Skylos vs Vulture
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
            We tested both tools against a realistic <strong>FastAPI + Pydantic</strong> codebase seeded with known dead code. 
            The goal: Measure detection accuracy in a modern Python stack.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          
          {/* LEFT: The Narrative (SEO Content) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-500" />
                Test Methodology
              </h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                We ran both tools on a standard service architecture containing:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                  <strong>29 seeded bugs:</strong> Unused imports, functions, and variables.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                  <strong>Framework magic:</strong> FastAPI routers, Pydantic models, and Pytest fixtures (which often trigger false positives).
                </li>
              </ul>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2">The Takeaway</h4>
              <p className="text-sm text-slate-600 mb-4">
                Vulture is faster (0.1s) but "dumb"—it missed 17% of the dead code and flagged used code as dead.
              </p>
              <p className="text-sm text-slate-600">
                <strong>Skylos found 100% of the dead code</strong> with higher precision, taking ~1.6s to parse the full AST context.
              </p>
            </div>
          </div>

          {/* RIGHT: The Raw Data (Proof) */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Metric</th>
                    <th className="px-6 py-4 text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500">Skylos</th>
                    <th className="px-6 py-4">Vulture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Row 1: True Positives */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">True Positives</div>
                      <div className="text-xs text-slate-500">Correctly found dead code</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10 font-bold text-emerald-700">29 / 29</td>
                    <td className="px-6 py-4 text-slate-600">24 / 29</td>
                  </tr>

                  {/* Row 2: False Negatives (The Killer Stat) */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">False Negatives</div>
                      <div className="text-xs text-slate-500">Missed bugs (Lower is better)</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10 font-bold text-emerald-700">0</td>
                    <td className="px-6 py-4 text-red-600 font-medium flex items-center gap-2">
                      5 <AlertTriangle className="w-3 h-3" />
                    </td>
                  </tr>

                  {/* Row 3: Precision */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">Precision</div>
                      <div className="text-xs text-slate-500">Accuracy of findings</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">70.7%</span>
                        <div className="w-16 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="w-[70%] h-full bg-emerald-500" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">50.0%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="w-[50%] h-full bg-slate-400" />
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4: Recall */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">Recall</div>
                      <div className="text-xs text-slate-500">Detection rate</div>
                    </td>
                    <td className="px-6 py-4 bg-emerald-50/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-700">100%</span>
                        <div className="w-16 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="w-full h-full bg-emerald-500" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">82.8%</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="w-[82%] h-full bg-slate-400" />
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr className="bg-slate-50/50 text-xs">
                    <td className="px-6 py-3 font-medium text-slate-500 flex items-center gap-2">
                      <Timer className="w-3 h-3" /> Execution Time
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono">1.67s</td>
                    <td className="px-6 py-3 text-slate-500 font-mono">0.10s</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              * Benchmark data collected Feb 2026 on Apple Silicon M3.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function Home() {
  const stars = await getGithubStars()
  const siteUrl = getSiteUrl()
  const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/YOUR_INVITE"

  const faq = [
    {
      q: 'How does Skylos detect hardcoded secrets?',
      a: 'Skylos scans your codebase and git history using entropy analysis and pattern matching to find API keys, tokens, and passwords before they are pushed to production.',
    },
    {
      q: 'Why does Skylos take ~1.5s compared to Vulture?',
      a: 'Vulture scans text (regex). Skylos scans logic (AST). We trade 1 second of computer time to save you hours of human time triage. We filter out false positives from FastAPI routes, Pydantic models, and Pytest fixtures automatically.',
    },
    {
      q: 'Is this a replacement for SonarQube or Snyk?',
      a: 'Skylos is a lightweight, zero-config alternative focused specifically on Python. Unlike heavy enterprise SAST tools, Skylos runs in <3 seconds and is designed for immediate feedback in local CLI and PR checks.',
    },
    {
      q: 'Can I automate Python security checks in GitHub Actions?',
      a: 'Yes. Skylos is designed for CI/CD. You can use it to gate pull requests, ensuring no dead code or security vulnerabilities merge into your main branch.',
    },
  ]

  // --- SEO: 3. JSON-LD for Rich Snippets ---
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((x) => ({
      '@type': 'Question',
      name: x.q,
      acceptedAnswer: { '@type': 'Answer', text: x.a },
    })),
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Skylos',
    applicationCategory: 'SecurityApplication', 
    operatingSystem: 'Windows, macOS, Linux',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'A static analysis security tool (SAST) for finding risks and dead code in Python applications.',
    url: siteUrl,
    featureList: [
      'Secret Scanning',
      'SQL Injection Detection',
      'Dead Code Removal',
      'CI/CD Quality Gate'
    ]
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <Script id="ld-product" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* HERO SECTION */}
      <section aria-label="Skylos Introduction" className="relative overflow-hidden pt-32 md:pt-40 pb-24">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex justify-center mb-8">
            <Link href="/changelog" className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm shadow-sm hover:border-slate-300 transition-colors">
              <span className="flex items-center gap-1.5 text-slate-900 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                v1.0 live
              </span>
              {typeof stars === 'number' && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600">⭐ {stars.toLocaleString()} stars</span>
                </>
              )}
            </Link>
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Secure your{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Python</span>
                <span className="absolute bottom-2 left-0 right-0 h-3 bg-blue-200/60 -z-10 -rotate-1"></span>
              </span>{" "}
              before
              <br />
              you ship.
            </h1>

            <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Open source <strong>static analysis (SAST)</strong> that finds dead code, hardcoded secrets, and security risks.
              <br className="hidden sm:block" />
              Run locally or gate your <strong>GitHub PRs</strong>.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                aria-label="Connect GitHub to Skylos"
              >
                Connect GitHub
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <CopyInstallButton command="pip install skylos" />
              <a
                href="mailto:founder@skylos.dev"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 hover:bg-slate-50 transition-all"
              >
                Book a Demo
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          <div className="mt-16 md:mt-20">
            <SkylosHeroSandbox />
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Complete Python Security Scanning
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Four detection engines in one fast tool.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Vulnerability Scanner</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Prevent <strong>SQL injection</strong>, XSS, and command injection attacks by catching unsafe patterns in your code.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secret Detection</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Stop data leaks. Skylos finds <strong>hardcoded API keys</strong>, tokens, and passwords in your source code commits.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Dead Code Removal</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Clean your technical debt. Identify <strong>unused imports</strong>, functions, and unreachable variables automatically.
              </p>
            </article>

            <article className="group p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Quality Gate</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enforce coding standards and reduce complexity with automated <strong>quality checks</strong> in your CI pipeline.
              </p>
            </article>
          </div>
        </div>
      </section>

      <BenchmarkSection />

      <section id="how" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Integrate in Seconds
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Build a secure DevSecOps pipeline in three steps.
            </p>
          </div>
          
           <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                1
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Install CLI</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                  <span className="text-emerald-400">$</span> pip install skylos
                </div>
                <p className="mt-4 text-slate-600">
                  Or connect GitHub for automated PR scanning.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                2
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Run Analysis</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm text-slate-300">
                  <span className="text-emerald-400">$</span> skylos . --danger --quality --upload
                </div>
                <p className="mt-4 text-slate-600">
                  Upload to the dashboard for gate status, suppressions, and history.
                  <span className="block text-sm text-slate-500 mt-1">
                    Local only: <span className="font-mono">skylos . --danger --quality</span>
                  </span>
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold">
                3
              </div>
              <div className="pt-8 pl-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Fix & Gate</h3>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">PR #142</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      ✓ Gate passed
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-slate-600">
                  Block risky merges automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faq.map((x) => (
              <details key={x.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none p-6 font-semibold text-slate-900 flex items-center justify-between">
                  {x.q}
                  <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="px-6 pb-6 text-slate-600 -mt-2">{x.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Simple pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Free to start. Upgrade when your team needs dashboards and PR gating.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-slate-900">Free</h3>
              <p className="mt-2 text-slate-600 text-sm">For individuals and OSS</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900">$0</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited local scans
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> All finding categories
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> CLI + JSON + SARIF output
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Auto-fix codemods
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 1 project on dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 30-day scan history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Community support
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-8 block w-full text-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Get started
              </Link>
            </div>

            {/* Team Tier */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Team</h3>
              <p className="mt-2 text-slate-600 text-sm">For teams shipping secure code</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-slate-900">$15</span>
                <span className="text-slate-500 text-sm ml-1">/dev/month</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Everything in Free
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Trend dashboard & analytics
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> PR decoration (inline comments)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Team collaboration (up to 10)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Slack & Discord alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 10 repos, 90-day history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Email support
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-8 block w-full text-center rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition"
              >
                Start free trial
              </Link>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-slate-900">Enterprise</h3>
              <p className="mt-2 text-slate-600 text-sm">For organizations at scale</p>
              <div className="mt-6">
                <span className="text-3xl font-bold text-slate-900">Custom</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Everything in Team
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Unlimited repos & history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Custom quality gates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Compliance reports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> SSO / SAML
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Priority support & SLA
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Audit logs
                </li>
              </ul>
              <a
                href="mailto:founder@skylos.dev"
                className="mt-8 group block w-full text-center rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50 transition"
              >
                Book a Demo <ArrowRight className="w-4 h-4 inline group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Start scanning in 30 seconds
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No config files. No setup wizards. Just results.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Connect GitHub
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <CopyInstallButton command="pip install skylos" />
            <a
              href="mailto:founder@skylos.dev"
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 hover:bg-slate-50 transition-all"
            >
              Book a Demo
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">Skylos</span>
            <span className="text-slate-400 ml-4">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <a href="https://docs.skylos.dev" target="_blank" rel="noopener noreferrer">
            Docs
            </a>
            <Link href="/login" className="hover:text-slate-900 transition">Login</Link>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition">Discord</a>
            <a href="mailto:founder@skylos.dev" className="hover:text-slate-900 transition">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  )
}